const superuser_db = require('../../config/dbcon');
const cryptoModule2 = require('crypto');
const { generateToken } = require('../middleware/auth');

// Hash password function
const hashPassword2 = (password: string) => {
  return cryptoModule2.createHash('sha256').update(password).digest('hex');
};

exports.getAllSuperusers = async (req: any, res: any) => {
  try {
    const result = await superuser_db.query('SELECT superuser_id, center_id, username, email, first_name, last_name, role, status, last_login, created_at, updated_at FROM superusers ORDER BY superuser_id DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch superusers', details: error.message || error.toString() });
  }
};

exports.getSuperuserById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await superuser_db.query('SELECT superuser_id, center_id, username, email, first_name, last_name, role, permissions, status, last_login, created_at, updated_at FROM superusers WHERE superuser_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch superuser', details: error.message || error.toString() });
  }
};

exports.createSuperuser = async (req: any, res: any) => {
  try {
    let { center_id, username, email, password, first_name, last_name, role, permissions, status } = req.body;
    
    // If center_id is not provided, get the first available center
    if (!center_id) {
      const centerResult = await superuser_db.query('SELECT center_id FROM edu_centers LIMIT 1');
      if (centerResult.rows.length === 0) {
        return res.status(400).json({ error: 'No centers available. Please create a center first.' });
      }
      center_id = centerResult.rows[0].center_id;
    }
    
    // Check if username already exists
    const existing = await superuser_db.query('SELECT superuser_id FROM superusers WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Store password as plain text without encryption
    // Normalize status to match enum values (Active, Inactive, Suspended)
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Active';
    const result = await superuser_db.query(
      'INSERT INTO superusers (center_id, username, email, password_hash, first_name, last_name, role, permissions, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING superuser_id, center_id, username, email, first_name, last_name, role, status, created_at',
      [center_id, username, email, password, first_name, last_name, role || 'Admin', permissions || {}, normalizedStatus]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create superuser', details: error.message || error.toString() });
  }
};

exports.updateSuperuser = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, role, permissions, status } = req.body;
    // Normalize status to match enum values (Active, Inactive, Suspended)
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : null;
    const result = await superuser_db.query(
      'UPDATE superusers SET email = COALESCE($1, email), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), role = COALESCE($4, role), permissions = COALESCE($5, permissions), status = COALESCE($6, status), updated_at = CURRENT_TIMESTAMP WHERE superuser_id = $7 RETURNING superuser_id, center_id, username, email, first_name, last_name, role, status, updated_at',
      [email, first_name, last_name, role, permissions, normalizedStatus, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update superuser', details: error.message || error.toString() });
  }
};

exports.deleteSuperuser = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await superuser_db.query('DELETE FROM superusers WHERE superuser_id = $1 RETURNING superuser_id, username, email', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }
    res.json({ message: 'Superuser deleted successfully', superuser: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete superuser', details: error.message || error.toString() });
  }
};

exports.login = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await superuser_db.query('SELECT superuser_id, username, email, first_name, last_name, role, password_hash, status, is_locked FROM superusers WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No superuser found with the provided username' });
    }

    const superuser = result.rows[0];

    if (superuser.is_locked) {
      return res.status(403).json({ error: 'Account is locked' });
    }

    if (superuser.status !== 'Active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const password_hash = password;
    if (password_hash !== superuser.password_hash) {
      // Update login attempts
      await superuser_db.query('UPDATE superusers SET login_attempts = login_attempts + 1 WHERE superuser_id = $1', [superuser.superuser_id]);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Reset login attempts on successful login
    await superuser_db.query('UPDATE superusers SET login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE superuser_id = $1', [superuser.superuser_id]);
    
    // Generate JWT token
    const token = generateToken({
      id: superuser.superuser_id,
      username: superuser.username,
      email: superuser.email,
      userType: 'superuser',
      role: superuser.role,
    });

    res.json({
      message: 'Login successful',
      token,
      superuser: {
        superuser_id: superuser.superuser_id,
        username: superuser.username,
        email: superuser.email,
        first_name: superuser.first_name,
        last_name: superuser.last_name,
        role: superuser.role
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || error.toString() });
  }
};

exports.changePassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const result = await superuser_db.query('SELECT password_hash FROM superusers WHERE superuser_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Superuser not found' });
    }

    const old_hash = old_password;
    if (old_hash !== result.rows[0].password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_hash = new_password;
    await superuser_db.query('UPDATE superusers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE superuser_id = $2', [new_hash, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || error.toString() });
  }
};

export {};
