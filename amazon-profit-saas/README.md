# Amazon Profit SaaS

A production-oriented Turborepo scaffold for an Amazon US profit and advertising analytics MVP.

## Included

- Next.js 16 + React + TypeScript + Tailwind CSS dashboard
- NestJS API with Better Auth email/password
- Raw PostgreSQL queries and SQL migrations
- Neon-compatible database connection
- BullMQ worker with local Redis / Upstash-compatible connection
- Mock Seller Central and Amazon Ads data
- Hourly + manual sync architecture
- Dated COGS and CSV upload endpoint
- True-profit calculation by SKU/ASIN
- PPC, refunds, orders, alerts, sync history, and CSV export
- Light/dark mode
- GitHub Actions, Docker Compose, ECS-ready Dockerfiles

## Start locally

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. API health is at `http://localhost:4000/v1/health`.

See `docs/architecture.md` and `docs/mvp-roadmap.md`.
