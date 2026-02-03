# CRM Backend

Express.js + TypeScript backend for CRM application with MySQL and Adminer.

## Installation

```bash
npm install
```

## Database Setup

### Using Docker Compose (Recommended)

Start MySQL and Adminer containers:

```bash
docker-compose up -d
```

**Access Adminer:**
- URL: http://localhost:5050
- System: MySQL
- Server: mysql
- Username: crm_user
- Password: crm_password
- Database: crm_db

### Create Tables

Connect to the database using Adminer and run the following SQL:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
- `DB_HOST` - MySQL host (default: localhost)
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - MySQL user
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - MySQL database name

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server

