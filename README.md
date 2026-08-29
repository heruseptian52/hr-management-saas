# HR Management SaaS

Production-oriented, multi-company HR and employee management platform. This repository is completely separate from the Panboy Community website.

## Current scope

Development follows phases P1–P10. Work currently starts at P1. A feature is not considered complete until its UI, backend, authorization, validation, and tests work together.

- P1: authentication, tenant isolation, RBAC, company, basic security
- P2: branch, department, position, employee management
- P3: shifts, scheduling, schedule exports
- P4: attendance, GPS/geofence, dynamic QR, corrections
- P5: dashboard, reports, import/export

P6–P10 will only start after P1–P5 are stable.

## Technology

- Next.js and TypeScript
- PostgreSQL
- Prisma ORM and migrations
- Secure HTTP-only JWT session cookie
- Zod validation

## Requirements

- Node.js 22+
- npm 10+
- PostgreSQL 16+, or Docker with Docker Compose

## Installation

```bash
git clone https://github.com/heruseptian52/hr-management-saas.git
cd hr-management-saas
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Health check: `http://localhost:3000/api/health`.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret of at least 32 characters |
| `APP_URL` | Public application URL |

Never commit `.env`, credentials, API keys, or production secrets.

`SEED_DEMO_PASSWORD` is required only when running the local demo seed. Choose your own value of at least 12 characters; the repository never stores a demo password.

## Database and tenant isolation

Every company-owned table includes `companyId`. Backend repositories obtain the company from the verified server session and always include it in database queries. Client-provided `companyId` values must never be trusted. Composite unique constraints prevent cross-company key collisions. Deletes are soft deletes unless an explicitly reviewed retention workflow requires otherwise.

## Migration and demo data

Create a development migration with `npm run db:migrate`. Seed commands will create at least two isolated demo companies once the P1 seed is implemented. Demo credentials must only be used locally.

## Production build

```bash
npm ci
npm run db:generate
npm run typecheck
npm test
npm run build
npm start
```

In production, run committed Prisma migrations through the deployment pipeline and use managed PostgreSQL with automated encrypted backups.

## Deployment

The project is builder-independent. It can run on any Node.js host supporting PostgreSQL, including Docker-based VPS infrastructure. Configure environment variables in the hosting provider and never place secrets in GitHub.

### Railway preview deployment

1. Create a Railway project from this GitHub repository.
2. Add a PostgreSQL service and expose its `DATABASE_URL` to the web service.
3. Set `AUTH_SECRET` to a random value of at least 32 characters and set `APP_URL` to the generated public URL.
4. Railway uses `railway.json` to build, synchronize the schema on the initial empty database, start the app, and verify `/api/health`.
5. Set `SEED_DEMO_PASSWORD` temporarily, run `npm run db:seed` once, then remove that variable if demo reseeding is not needed.

The initial Railway preview uses `prisma db push` only against a newly provisioned empty database. Subsequent production schema changes must be represented by reviewed Prisma migration files and deployed with `npm run db:deploy`.

## Repository target

`https://github.com/heruseptian52/hr-management-saas`
