/**
 * JWT Authentication & Role-Based Access Control Middleware
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'crm_jwt_secret_key_2024_change_in_production';
const JWT_EXPIRES_IN = '24h';

// Type definitions
type UserType = 'superuser' | 'teacher' | 'student';

interface JwtPayload {
  id: number;
  username?: string;
  email?: string;
  userType: UserType;
  center_id?: number;
  class_id?: number;
  role?: string;
}

/**
 * Generate a JWT token for an authenticated user
 */
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Middleware: Require authentication (any valid JWT)
 * Attaches `req.user` with the decoded token payload
 */
function requireAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired. Please log in again.' });
    } else {
      res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
  }
}

/**
 * Middleware: Require specific user types (role-based access)
 * Must be used AFTER requireAuth
 * 
 * Usage:
 *   requireRole('superuser')              — only superusers
 *   requireRole('superuser', 'teacher')   — superusers or teachers
 */
function requireRole(...allowedTypes: UserType[]) {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedTypes.includes(req.user.userType)) {
      res.status(403).json({ 
        error: 'Access denied. You do not have permission to perform this action.',
        required: allowedTypes,
        current: req.user.userType
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: Require that authenticated user can only access their own data
 * Checks if request parameter matches the authenticated user's ID
 * Superusers bypass this check (they can access any user's data)
 * 
 * Usage:
 *   requireSelfOrAdmin('studentId')  — student can only access their own data
 */
function requireSelfOrAdmin(paramName: string, userIdField: string = 'id') {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Superusers and teachers can access any data
    if (req.user.userType === 'superuser' || req.user.userType === 'teacher') {
      next();
      return;
    }

    const requestedId = parseInt(req.params[paramName], 10);
    const userId = req.user[userIdField];

    if (requestedId !== userId) {
      res.status(403).json({ 
        error: 'Access denied. You can only access your own data.' 
      });
      return;
    }

    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  requireRole,
  requireSelfOrAdmin,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
