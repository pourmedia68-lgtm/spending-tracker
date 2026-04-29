# Spending Tracker — Backend (NestJS)

REST API for the Spending Tracker mobile app.

- **Framework:** NestJS 10 (Express)
- **Database:** PostgreSQL via Prisma 5
- **Auth:** JWT access + rotating refresh tokens, plus Google OAuth 2.0
- **Validation:** class-validator + class-transformer (global pipe)
- **Sync model:** `?since=<ISO timestamp>` + `?includeDeleted=true` on every
  list endpoint. Soft delete via `deletedAt` so the mobile client can apply
  tombstones.
- **Docs:** Swagger UI mounted at `/docs`.

## Getting started

```bash
# 1. Install deps
npm install

# 2. Start Postgres (Docker)
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Generate two strong secrets:
openssl rand -base64 48     # → JWT_ACCESS_SECRET
openssl rand -base64 48     # → JWT_REFRESH_SECRET

# 4. Apply migrations + generate the Prisma client
npx prisma migrate dev --name init

# 5. Run the API
npm run start:dev
```

The API is available at `http://localhost:3000/api/v1` and the Swagger UI
at `http://localhost:3000/docs`.

## Endpoint overview

| Method | Path                                 | Description                                  |
| ------ | ------------------------------------ | -------------------------------------------- |
| POST   | `/api/v1/auth/register`              | Email + password sign-up                     |
| POST   | `/api/v1/auth/login`                 | Email + password login                       |
| POST   | `/api/v1/auth/refresh`               | Rotate refresh, get a new access token       |
| POST   | `/api/v1/auth/logout`                | Revoke a refresh token                       |
| GET    | `/api/v1/auth/google`                | Begin Google OAuth flow                      |
| GET    | `/api/v1/auth/google/callback`       | Google OAuth callback                        |
| GET    | `/api/v1/users/me`                   | Get the current user                         |
| PATCH  | `/api/v1/users/me`                   | Update display name / currency / locale      |
| GET    | `/api/v1/settings`                   | Get user settings                            |
| PUT    | `/api/v1/settings`                   | Update user settings                         |
| GET    | `/api/v1/budgets`                    | List budgets (sync)                          |
| PUT    | `/api/v1/budgets`                    | Upsert the budget for one month              |
| DELETE | `/api/v1/budgets/:monthKey`          | Soft-delete a budget                         |
| GET    | `/api/v1/expenses`                   | List expenses (sync)                         |
| POST   | `/api/v1/expenses`                   | Create an expense (id supplied by client)    |
| PATCH  | `/api/v1/expenses/:id`               | Update an expense                            |
| DELETE | `/api/v1/expenses/:id`               | Soft-delete an expense                       |
| GET    | `/api/v1/category-configs`           | List per-user category overrides             |
| PUT    | `/api/v1/category-configs`           | Upsert a category override                   |
| DELETE | `/api/v1/category-configs/:id`       | Soft-delete a category override              |
| GET    | `/api/v1/analytics/month/:monthKey`  | Month summary (spent, prorated, projected)   |
| GET    | `/api/v1/analytics/mom/:monthKey`    | Month-over-month comparison                  |
| GET    | `/api/v1/health`                     | Liveness probe                               |

### Admin endpoints (role `ADMIN` required)

| Method | Path                                          | Description                                  |
| ------ | --------------------------------------------- | -------------------------------------------- |
| GET    | `/api/v1/admin/users`                         | Paginated user list with search/filters      |
| GET    | `/api/v1/admin/users/:id`                     | Full user detail incl. settings + counts     |
| GET    | `/api/v1/admin/users/:id/expenses`            | Recent expenses for one user                 |
| GET    | `/api/v1/admin/users/:id/budgets`             | Budgets history for one user                 |
| PATCH  | `/api/v1/admin/users/:id`                     | Update one user (incl. role)                 |
| DELETE | `/api/v1/admin/users/:id`                     | Soft-delete a user (revokes sessions)        |
| POST   | `/api/v1/admin/users/:id/restore`             | Undo a soft-delete                           |
| POST   | `/api/v1/admin/users/:id/reset-password`      | Mint a temp password, revoke sessions        |
| GET    | `/api/v1/admin/stats/kpis`                    | Top-level KPIs                               |
| GET    | `/api/v1/admin/stats/daily?days=30`           | Daily signups + expense series               |
| GET    | `/api/v1/admin/stats/expenses-by-category`    | Spending grouped by category, current month  |
| GET    | `/api/v1/admin/stats/top-users?take=10`       | Top spenders this month                      |
| GET    | `/api/v1/admin/audit-log`                     | Paginated audit log                          |
| GET    | `/api/v1/admin/export/users.csv`              | CSV export of all users                      |
| GET    | `/api/v1/admin/export/expenses.csv?userId=…`  | CSV export of expenses (all or per user)     |

### Promote a user to admin

```bash
# Promote an existing account
npm run seed:admin -- you@example.com

# Or provision an admin from scratch (must include --create + --password)
npm run seed:admin -- you@example.com --create --password 'SuperStrong!Pwd'
```

## Sync model

All "list" endpoints accept these optional query params for incremental sync:

- `since=<ISO timestamp>` — return only rows with `updatedAt > since`.
- `includeDeleted=true` — also return rows with `deletedAt` set so the
  client can purge them locally.

Recommended client flow:

1. On startup, read `lastSyncedAt` from local storage (default `null`).
2. Pull from each list endpoint with `?since=<lastSyncedAt>&includeDeleted=true`.
3. Apply the changes to the local cache (Hive on the mobile side).
4. Push any local pending operations (creates / updates / deletes).
5. Persist `lastSyncedAt = now()`.

Expense creation accepts a client-supplied UUID, which makes the call
idempotent: replaying the same `id` after a flaky network won't create
duplicates.

## Tests

```bash
npm test            # unit tests (Jest)
npm run test:cov    # coverage
npm run lint        # ESLint
```

## Production deploy (VPS)

See [`deploy/README.md`](./deploy/README.md) for a full Ubuntu 22.04 walkthrough
(systemd + nginx + Let's Encrypt, or alternatively Docker Compose).
