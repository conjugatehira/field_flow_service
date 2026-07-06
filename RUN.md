# Run FieldFlow

## Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres + Redis)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres & Redis
docker compose up -d

# 3. Copy env and configure
cp .env.example .env

# 4. Generate Prisma client & run migrations
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
cd ../..

# 5. Seed sample data
npm run seed

# 6. Start API server
npm run dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API (alias for dev:api) |
| `npm run dev:api` | Start API server on :4000 |
| `npm test` | Run all tests |
| `npm run seed` | Seed database with sample data |
| `npm run migrate` | Run pending migrations |

## Without Docker (SQLite fallback)

Set `DATABASE_URL` to a SQLite file path in `.env`:
```
DATABASE_URL="file:./dev.db"
```
