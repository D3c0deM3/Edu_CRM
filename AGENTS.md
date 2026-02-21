# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Education-focused CRM system for managing students, teachers, classes, attendance, grades, payments, and assignments.

## Monorepo Structure

- `CRM_backend/` - Express.js + TypeScript REST API with PostgreSQL
- `CRM_frontend/` - React + TypeScript + Vite SPA with MUI and Redux Toolkit
- `CRM_database/` - Database schemas and migrations
- `docs/` - Documentation

## Development Commands

### Backend (CRM_backend/)
```bash
npm install              # Install dependencies
npm run dev              # Start dev server with hot reload (nodemon + ts-node)
npm run build            # Compile TypeScript to dist/
npm start                # Run production build
```

### Frontend (CRM_frontend/)
```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server
npm run build            # Type-check and build for production
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

### Database
```bash
docker-compose up -d     # Start PostgreSQL + pgAdmin containers (from CRM_backend/)
```
- pgAdmin: http://localhost:5050 (admin@crm.com / admin_password)
- PostgreSQL: localhost:5432 (crm_user / crm_password / crm_db)

## Architecture

### Backend
Standard MVC pattern with controller-route separation:
- `src/index.ts` - Express app entry point
- `src/routes/` - Route definitions (one file per domain)
- `src/controllers/` - Business logic handlers
- `src/swagger/` - API documentation config

**Domains:** students, teachers, classes, centers, subjects, assignments, attendance, grades, payments, debts, tests, superusers

### Frontend
Feature-based architecture with centralized state:
- `src/features/` - Feature modules (pages + components per domain)
- `src/pages/` - Top-level page components (auth, etc.)
- `src/slices/` - Redux Toolkit slices
- `src/store/` - Redux store configuration
- `src/shared/` - Shared utilities and API client
- `src/components/` - Reusable UI components
- `src/theme/` - MUI theme customization

**State Management:** Redux Toolkit with feature-specific slices
**UI Library:** Material-UI (MUI) v7
**Routing:** React Router DOM v7

## Environment Variables

Backend requires PostgreSQL connection config:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PORT` (default: 3000)
- `NODE_ENV`
