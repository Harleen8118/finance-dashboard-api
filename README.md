# Finance App Backend

Backend service for managing financial records, tracking analytics, and handling user roles. Built with NestJS, Prisma, and PostgreSQL.

## Stack

| Technology | Purpose |
|---|---|
| Node.js 20 | Runtime |
| TypeScript (strict) | Type safety |
| NestJS 10 | Framework |
| Prisma 5 | ORM |
| PostgreSQL 16 | Database |
| JWT + Passport | Authentication |
| bcrypt | Password hashing |
| class-validator | DTO validation |
| @nestjs/swagger | API documentation |
| @nestjs/event-emitter | SSE live streaming |
| @nestjs/throttler | Rate limiting |
| Jest + Supertest | Testing |
| Docker Compose | Database provisioning |

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd finance-dashboard-api

# 2. Copy environment file
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Install dependencies
npm install

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Seed the database
npx prisma db seed

# 7. Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api`.

## Seeded Users

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@finance.com | Admin1234! |
| ANALYST | analyst@finance.com | Analyst1234! |
| VIEWER | viewer@finance.com | Viewer1234! |

## API Endpoints

### Auth (Public)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login and receive JWT |

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass1!","name":"User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finance.com","password":"Admin1234!"}'
```

### Users (ADMIN only)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | ADMIN | List users (filters: ?isActive, ?role) |
| GET | `/users/:id` | ADMIN | Get user by ID |
| PATCH | `/users/:id` | ADMIN | Update user (name, role, isActive) |
| DELETE | `/users/:id` | ADMIN | Soft-disable user |

```bash
# List users
curl http://localhost:3000/users \
  -H "Authorization: Bearer <admin-token>"

# Update user role
curl -X PATCH http://localhost:3000/users/<id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"ANALYST"}'
```

### Financial Records

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/records` | All | List records (filters: ?type, ?category, ?from, ?to, ?page, ?limit) |
| GET | `/records/:id` | All | Get record by ID |
| POST | `/records` | ADMIN | Create a record |
| PATCH | `/records/:id` | ADMIN | Update a record |
| DELETE | `/records/:id` | ADMIN | Soft-delete a record |

```bash
# List records with filters
curl "http://localhost:3000/records?type=INCOME&page=1&limit=10" \
  -H "Authorization: Bearer <token>"

# Create record
curl -X POST http://localhost:3000/records \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000.50,"type":"INCOME","category":"Salary","date":"2026-03-15T00:00:00.000Z","description":"Monthly salary"}'
```

### Dashboard

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/dashboard/summary` | All | Total income, expenses, net balance, record count |
| GET | `/dashboard/by-category` | All | Grouped by category + type |
| GET | `/dashboard/trends` | ANALYST, ADMIN | Monthly trends for last 12 months |
| GET | `/dashboard/recent` | All | Last 10 records (newest first) |
| GET | `/dashboard/stream` | All | SSE stream of live summary updates |

```bash
# Get summary
curl http://localhost:3000/dashboard/summary \
  -H "Authorization: Bearer <token>"

# Get trends (ANALYST/ADMIN only)
curl http://localhost:3000/dashboard/trends \
  -H "Authorization: Bearer <analyst-token>"

# SSE stream
curl -N http://localhost:3000/dashboard/stream \
  -H "Authorization: Bearer <token>"
```

### Audit Logs (ADMIN only)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/audit-logs` | ADMIN | List audit logs (filters: ?userId, ?action, ?page, ?limit) |

```bash
curl "http://localhost:3000/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer <admin-token>"
```

## Assumptions

1. **Registration is public** - any visitor can register. New users default to `VIEWER` role. In production, you would likely restrict role assignment or require email verification.
2. **JWT secret is static** - configured via `JWT_SECRET` env var. In production, use a strong random secret and rotate periodically.
3. **Soft deletion** - records and users are never physically deleted. `isDeleted` and `isActive` flags are used respectively to preserve audit trail integrity.
4. **Single-tenant** - all users see all financial records. Multi-tenant isolation would require a `tenantId` field.
5. **No refresh tokens** - the API issues a single JWT with configurable expiry. A refresh token mechanism would be added for production.

## Architecture Decisions

### Why Decimal, not Float, for amounts

Floating-point arithmetic in IEEE 754 (what JavaScript's `number` type and PostgreSQL's `float` use) introduces rounding errors that are unacceptable in financial applications. For example, `0.1 + 0.2 !== 0.3` in JavaScript. Prisma's `Decimal` maps to PostgreSQL's `NUMERIC(12,2)`, which stores exact decimal values with fixed precision, critical for accounting correctness.

### Why soft delete

Financial data must be retained for audit, compliance, and reconciliation purposes. Hard deletion would break audit trails and make it impossible to investigate historical discrepancies. The `isDeleted` flag allows records to be hidden from normal queries while remaining available for administrative review.

### Why audit logging

Every mutation (POST, PATCH, DELETE) is automatically logged with the acting user, timestamp, IP address, and request payload. This provides a complete audit trail for compliance (SOX, GDPR), debugging, and security incident investigation. The interceptor pattern ensures logging is consistent and cannot be accidentally omitted from a new endpoint.

### How SSE works

The `/dashboard/stream` endpoint uses Server-Sent Events (SSE), a lightweight, HTTP-based protocol for server-to-client push. When any financial record is created, updated, or deleted, the `RecordsService` emits a `records.changed` event via `EventEmitter2`. The SSE endpoint subscribes to this event using RxJS `fromEvent`, fetches fresh aggregate data via `getSummary()`, and pushes it to all connected clients. This avoids polling and provides near-real-time dashboard updates with minimal overhead.

### Rate limiting

A custom `ThrottlerGuard` applies different rate limits per role: `VIEWER` users are limited to 30 requests per 60 seconds, while `ANALYST` and `ADMIN` users get 100 requests per 60 seconds. This prevents abuse from lower-privilege accounts while giving power users adequate throughput.
