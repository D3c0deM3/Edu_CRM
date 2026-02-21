const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM Backend API',
      version: '1.0.0',
      description: 'Complete CRM System API Documentation',
      contact: {
        name: 'CRM Support',
        email: 'support@crm.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development Server'
      }
    ],
    components: {
      schemas: {
        Student: {
          type: 'object',
          properties: {
            student_id: { type: 'integer' },
            center_id: { type: 'integer' },
            enrollment_number: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' },
            parent_name: { type: 'string' },
            parent_phone: { type: 'string' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Graduated', 'Removed'] },
            teacher_id: { type: 'integer' },
            class_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Teacher: {
          type: 'object',
          properties: {
            teacher_id: { type: 'integer' },
            center_id: { type: 'integer' },
            employee_id: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
            qualification: { type: 'string' },
            specialization: { type: 'string' },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Retired'] },
            roles: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Class: {
          type: 'object',
          properties: {
            class_id: { type: 'integer' },
            center_id: { type: 'integer' },
            class_name: { type: 'string' },
            class_code: { type: 'string' },
            level: { type: 'integer' },
            section: { type: 'string' },
            capacity: { type: 'integer' },
            teacher_id: { type: 'integer' },
            room_number: { type: 'string' },
            total_students: { type: 'integer' },
            payment_amount: { type: 'number', format: 'decimal' },
            payment_frequency: { type: 'string', enum: ['Monthly', 'Quarterly', 'Annual'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Center: {
          type: 'object',
          properties: {
            center_id: { type: 'integer' },
            center_name: { type: 'string' },
            center_code: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            principal_name: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            payment_id: { type: 'integer' },
            student_id: { type: 'integer' },
            center_id: { type: 'integer' },
            payment_date: { type: 'string', format: 'date' },
            amount: { type: 'number', format: 'decimal' },
            currency: { type: 'string' },
            payment_method: { type: 'string', enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Digital Wallet'] },
            transaction_reference: { type: 'string' },
            receipt_number: { type: 'string' },
            payment_status: { type: 'string', enum: ['Pending', 'Completed', 'Failed', 'Refunded'] },
            payment_type: { type: 'string' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Debt: {
          type: 'object',
          properties: {
            debt_id: { type: 'integer' },
            student_id: { type: 'integer' },
            center_id: { type: 'integer' },
            debt_amount: { type: 'number', format: 'decimal' },
            debt_date: { type: 'string', format: 'date' },
            due_date: { type: 'string', format: 'date' },
            amount_paid: { type: 'number', format: 'decimal' },
            balance: { type: 'number', format: 'decimal' },
            remarks: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Grade: {
          type: 'object',
          properties: {
            grade_id: { type: 'integer' },
            student_id: { type: 'integer' },
            teacher_id: { type: 'integer' },
            subject: { type: 'string' },
            class_id: { type: 'integer' },
            marks_obtained: { type: 'number', format: 'decimal' },
            total_marks: { type: 'integer' },
            percentage: { type: 'number', format: 'decimal' },
            grade_letter: { type: 'string' },
            academic_year: { type: 'integer' },
            term: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Attendance: {
          type: 'object',
          properties: {
            attendance_id: { type: 'integer' },
            student_id: { type: 'integer' },
            teacher_id: { type: 'integer' },
            class_id: { type: 'integer' },
            attendance_date: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['Present', 'Absent', 'Late', 'Half Day'] },
            remarks: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Assignment: {
          type: 'object',
          properties: {
            assignment_id: { type: 'integer' },
            class_id: { type: 'integer' },
            assignment_title: { type: 'string' },
            description: { type: 'string' },
            due_date: { type: 'string', format: 'date' },
            submission_date: { type: 'string', format: 'date' },
            grade: { type: 'number', format: 'decimal' },
            status: { type: 'string', enum: ['Pending', 'Submitted', 'Graded'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Subject: {
          type: 'object',
          properties: {
            subject_id: { type: 'integer' },
            class_id: { type: 'integer' },
            subject_name: { type: 'string' },
            subject_code: { type: 'string' },
            teacher_id: { type: 'integer' },
            total_marks: { type: 'integer' },
            passing_marks: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Superuser: {
          type: 'object',
          properties: {
            superuser_id: { type: 'integer' },
            center_id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            password_hash: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string' },
            permissions: { type: 'object' },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Suspended'] },
            last_login: { type: 'string', format: 'date-time' },
            login_attempts: { type: 'integer' },
            is_locked: { type: 'boolean' },
            locked_until: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

module.exports = swaggerJsdoc(swaggerOptions);
