# Finance Dashboard API

Backend API for a finance dashboard system with role-based access control, transaction management, dashboard summaries, and Swagger documentation.

## Features

- JWT-based authentication
- Role-based access control for `viewer`, `analyst`, and `admin`
- User management with active/inactive status
- Transaction CRUD with filtering, pagination, and soft delete
- Dashboard summary APIs for totals, category breakdowns, recent activity, and trends
- Request validation and structured error responses
- Swagger UI for API exploration
- Integration tests with in-memory SQLite

## Tech Stack

- Node.js
- TypeScript
- Express
- SQLite via `better-sqlite3`
- Jest + Supertest
- Swagger (`swagger-jsdoc` + `swagger-ui-express`)

## Role Model

- `viewer`: can read dashboard data and transaction records
- `analyst`: can read dashboard data and transaction records
- `admin`: full access to user management and transaction management

Public self-registration always creates a `viewer` account. Elevated roles can only be assigned by an admin.

## API Highlights

Base API path: `/api/v1`

Main route groups:

- `/auth`
- `/users`
- `/transactions`
- `/dashboard`

Useful public endpoints:

- `GET /`
- `GET /health`
- `GET /api-docs`
- `GET /api-docs.json`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Copy `.env.example` to `.env` and adjust values if needed.

Example:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=dev-secret-key-do-not-use-in-production
JWT_EXPIRES_IN=7d
DB_PATH=./data/finance.db
```

### 3. Run in development

```bash
npm run dev
```

### 4. Open the API

- App root: `http://localhost:3000/`
- Health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/api-docs`

## Production Build

```bash
npm run build
npm start
```

In production, `JWT_SECRET` must be explicitly set.

## Testing

Run the test suite:

```bash
npm test
```

If your environment blocks Jest worker processes, this also works:

```bash
npx jest --runInBand --forceExit --detectOpenHandles
```

## Data Persistence

The app uses SQLite for persistence. By default, the database file is stored at:

```text
./data/finance.db
```

Tests use an in-memory SQLite database.

## Validation and Error Handling

- invalid input returns `422`
- unauthenticated requests return `401`
- forbidden actions return `403`
- missing resources return `404`
- duplicate email conflicts return `409`

Error responses follow a consistent JSON shape:

```json
{
  "error": "Validation Error",
  "message": "Invalid input data.",
  "details": []
}
```

## Assumptions and Tradeoffs

- SQLite was chosen for simplicity and local portability.
- Public registration is limited to viewer accounts for safer access control.
- Tokens are checked against the current database user state on protected requests, so deactivated users lose access immediately.
- Monthly dashboard trends default to the last 12 months, but respect explicit `date_from` and `date_to` filters when provided.

## Deployment Note

This project works well locally with SQLite, but cloud deployment is easier with a hosted Postgres database if you want a free platform without persistent local disk support.
