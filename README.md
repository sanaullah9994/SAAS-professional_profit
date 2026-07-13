# Amazon Profit SaaS

> A production-oriented SaaS scaffold for Amazon US profit and advertising analytics.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=fff)](https://nestjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=fff)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=fff)](https://redis.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=fff)](https://turbo.build/repo)

---

## Architecture

```
apps/
  api/        – NestJS REST API with Better Auth
  web/        – Next.js 16 dashboard (App Router)
  worker/     – BullMQ background job processor
packages/
  config/     – Shared TypeScript configs
  db/         – PostgreSQL queries, migrations, seeds
  types/      – Shared TypeScript types
  ui/         – Shared UI components
  utils/      – Shared utility functions
```

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10 (enable via `corepack enable`)
- **Docker** (for PostgreSQL + Redis)

## Quick Start

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- **Dashboard** – http://localhost:3000
- **API** – http://localhost:4000
- **Health** – `GET /v1/health`

## Services

| Service  | Tech              | Port |
|----------|-------------------|------|
| Web      | Next.js 16        | 3000 |
| API      | NestJS            | 4000 |
| Worker   | BullMQ + Redis    | –    |
| Postgres | PostgreSQL 17     | 5432 |
| Redis    | Redis 7           | 6379 |

## Scripts

| Command            | Description                    |
|--------------------|--------------------------------|
| `pnpm dev`         | Start all services in dev mode |
| `pnpm build`       | Build all packages and apps    |
| `pnpm db:migrate`  | Run database migrations        |
| `pnpm db:seed`     | Seed with mock data            |
| `pnpm lint`        | Run type-checking across all   |
| `pnpm clean`       | Remove all build artifacts     |

## Features

- Realistic profit calculation (revenue - fees - COGS - ads - refunds)
- Mock Amazon SP-API and Ads API data
- Hourly + manual sync via BullMQ
- Effective-dated COGS with CSV upload
- SKU/ASIN-level profitability
- PPC analytics, refunds, alerts, sync history
- Light/dark mode

## Deployment

Dockerfiles are included for each app under `apps/*/Dockerfile`. The project is ECS-ready and includes a GitHub Actions CI workflow.

## Documentation

See the [`docs/`](./docs) folder for architecture details and the MVP roadmap.
