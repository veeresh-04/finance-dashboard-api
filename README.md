# Finance Dashboard API

Backend API for a finance dashboard system with role-based access control, financial record management, dashboard analytics, validation, and API documentation.

## Links

- Live API: https://finance-dashboard-api-xd9i.onrender.com
- Swagger Docs: https://finance-dashboard-api-xd9i.onrender.com/api-docs
- Health Check: https://finance-dashboard-api-xd9i.onrender.com/health
- GitHub Repository: https://github.com/veeresh-04/finance-dashboard-api

## Project Summary

This project was built as a backend assignment focused on backend architecture, API design, business logic, access control, and maintainability.

The system supports:

- user registration and authentication
- role-based access control for `viewer`, `analyst`, and `admin`
- user lifecycle management with active/inactive status
- financial transaction CRUD operations
- filtering, pagination, and soft-delete support
- dashboard summary analytics such as totals, category breakdowns, recent activity, and trends
- Swagger API documentation
- integration tests

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Supabase Postgres
- Render
- Jest
- Supertest
- Swagger

## Role Model

- `viewer`: can read dashboard summaries and transaction data
- `analyst`: can read dashboard summaries and transaction data
- `admin`: can manage users and fully manage financial records

Public self-registration always creates a `viewer` account. Elevated roles can only be assigned by an admin.

## Core Features

### 1. User and Role Management

- create and manage users
- assign roles
- activate or deactivate users
- block unauthorized actions using backend middleware

### 2. Financial Records Management

- create transactions
- list transactions
- get transaction by ID
- update transactions
- soft-delete transactions
- filter by type, category, date range, and search term
- paginate transaction listings

### 3. Dashboard Summary APIs

- total income
- total expenses
- net balance
- category-wise aggregates
- monthly trends
- recent transactions

### 4. Access Control

- JWT-based authentication
- middleware-based authorization
- role hierarchy enforcement
- inactive users lose access to protected routes immediately

### 5. Validation and Error Handling

- request validation using `express-validator`
- consistent JSON error responses
- proper HTTP status codes such as `401`, `403`, `404`, `409`, and `422`

## API Overview

Base API path: `/api/v1`

Main route groups:

- `/auth`
- `/users`
- `/transactions`
- `/dashboard`

Useful public routes:

- `GET /`
- `GET /health`
- `GET /api-docs`
- `GET /api-docs.json`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file based on `.env.example`.

Example:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-do-not-use-in-production
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://username:password@host:5432/database
```

### 3. Run locally

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm start
```

## Testing

Run the full test suite:

```bash
npm test
```

If worker processes are restricted in your environment:

```bash
npx jest --runInBand --forceExit --detectOpenHandles
```

## Deployment

This project is deployed on:

- Supabase for PostgreSQL database hosting
- Render for backend hosting

Environment variables required in production:

- `NODE_ENV=production`
- `JWT_SECRET=<secure-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `DATABASE_URL=<supabase-session-pooler-url>`

## Validation and Error Response Example

```json
{
  "error": "Validation Error",
  "message": "Invalid input data.",
  "details": []
}
```

## Assumptions and Tradeoffs

- PostgreSQL was chosen over SQLite to make cloud deployment practical on free hosting platforms.
- Public signup is intentionally restricted to viewer accounts for safer default access control.
- User state is rechecked from the database on protected requests so deactivated users cannot continue using old tokens.
- Monthly trends default to the last 12 months, but respect explicit date filters when provided.

## Submission Notes

This implementation emphasizes:

- clear route/service separation
- backend-enforced permissions
- maintainable TypeScript structure
- predictable validation and error handling
- test coverage for core flows
- deployability with public API documentation
