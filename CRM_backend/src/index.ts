const express = require('express');
const cors = require('cors');
require('dotenv/config');
const swaggerUI = require('swagger-ui-express');
const swaggerDocs = require('./swagger/swagger');
const { requireAuth, requireRole } = require('./middleware/auth');
const { requireActiveCenterSubscription } = require('./services/crmSubscriptionService');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const classRoutes = require('./routes/classRoutes');
const centerRoutes = require('./routes/centerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const debtRoutes = require('./routes/debtRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const superuserRoutes = require('./routes/superuserRoutes');
const testRoutes = require('./routes/testRoutes');
const teacherSalaryRoutes = require('./routes/teacherSalaryRoutes');
const desktopAuthRoutes = require('./routes/desktopAuthRoutes');
const { startParentTelegramBot } = require('./services/parentBotService');

const app = express();
const PORT = process.env.PORT || 3000;
const corsWhitelist = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:1420',
  'http://127.0.0.1:1420',
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'https://edu-crm-psi.vercel.app',
  'https://www.edu-crm-psi.vercel.app',
];

// Middleware
app.use(
  cors({
    origin: (origin: string | undefined, callback: any) => {
      // Allow requests from non-browser tools and whitelisted browser origins.
      if (!origin || corsWhitelist.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// function to log the coming requests

app.use((req: any, res: any, next: any): void => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});
// Health check
app.get('/api/health', (req: any, res: any): void => {
  res.json({ status: 'OK', message: 'CRM Backend Server is running' });
});


// Swagger UI
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs, { explorer: true }));

// API Routes
// Auth routes (public - no authentication required)
app.post('/api/students/auth/login', require('./controllers/studentController').studentLogin);
app.post('/api/teachers/auth/login', require('./controllers/teacherController').teacherLogin);
app.post('/api/superusers/auth/login', require('./controllers/superuserController').login);
app.use('/api/desktop-auth', desktopAuthRoutes);

// Protected routes - require authentication + role-based access
// Students: superuser and teacher can manage; students can view own data via portal
app.use('/api/students', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher'), studentRoutes);

// Teachers: superuser manages; teachers read
app.use('/api/teachers', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher'), teacherRoutes);

// Classes: superuser and teacher
app.use('/api/classes', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher'), classRoutes);

// Centers: superuser manages; teachers read
app.use('/api/centers', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher'), centerRoutes);

// Payments: superuser only
app.use('/api/payments', requireAuth, requireActiveCenterSubscription, requireRole('superuser'), paymentRoutes);

// Debts: superuser only
app.use('/api/debts', requireAuth, requireActiveCenterSubscription, requireRole('superuser'), debtRoutes);

// Teacher salaries: superuser only
app.use('/api/teacher-salaries', requireAuth, requireActiveCenterSubscription, requireRole('superuser'), teacherSalaryRoutes);

// Grades: superuser and teacher manage; students can read their own
app.use('/api/grades', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher', 'student'), gradeRoutes);

// Attendance: superuser and teacher manage; students can read their own
app.use('/api/attendance', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher', 'student'), attendanceRoutes);

// Assignments: superuser and teacher
app.use('/api/assignments', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher'), assignmentRoutes);

// Subjects: superuser and teacher
app.use('/api/subjects', requireAuth, requireActiveCenterSubscription, requireRole('superuser', 'teacher'), subjectRoutes);

// Superusers: superuser only for management
app.use('/api/superusers', requireAuth, requireActiveCenterSubscription, requireRole('superuser'), superuserRoutes);

// Tests: authenticated users (role checks are more granular inside routes)
app.use('/api/tests', requireAuth, requireActiveCenterSubscription, testRoutes);

// Error handling middleware
app.use((err: Error, req: any, res: any, next: any): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  void startParentTelegramBot();
});

// Graceful shutdown - use a flag to prevent multiple calls
let isShuttingDown = false;

const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('Shutting down gracefully...');
  const pool = require('../config/dbcon');
  
  server.close(async () => {
    try {
      await pool.end();
      console.log('Server and database pool closed');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export {};
