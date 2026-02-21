# CRM Backend

Express.js + TypeScript backend for CRM application with PostgreSQL and pgAdmin.

## Installation

```bash
npm install
```

## Database Setup

### Using Docker Compose (Recommended)

Start PostgreSQL and pgAdmin containers:

```bash
docker-compose up -d
```

**Access pgAdmin:**
- URL: http://localhost:5050
- Email: admin@crm.com
- Password: admin_password

**PostgreSQL Connection in pgAdmin:**
- Host: postgres
- Port: 5432
- Username: crm_user
- Password: crm_password
- Database: crm_db

### Create Tables

Connect to the database using pgAdmin and run the following SQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

Run the development server with auto-reload:

```bash
npm run dev
```

## Production

Build and start:

```bash
npm run build
npm start
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user (body: { email, name })

## Project Structure

```
src/
  ├── index.ts          # Main server file
  ├── routes/           # API routes
  ├── controllers/      # Route controllers
  └── middleware/       # Custom middleware
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - PostgreSQL user
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - PostgreSQL database name

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server


