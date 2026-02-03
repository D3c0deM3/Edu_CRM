import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUI from 'swagger-ui-express';
import swaggerDocs from './swagger/swagger';
import db from '../config/dbcon';

// Import routes
import studentRoutes from './routes/studentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import classRoutes from './routes/classRoutes';
import centerRoutes from './routes/centerRoutes';
import paymentRoutes from './routes/paymentRoutes';
import debtRoutes from './routes/debtRoutes';
import gradeRoutes from './routes/gradeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import subjectRoutes from './routes/subjectRoutes';
import superuserRoutes from './routes/superuserRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/superusers', superuserRoutes);

// Error handling middleware
app.use((err: Error, req: any, res: any, next: any): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await db.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
