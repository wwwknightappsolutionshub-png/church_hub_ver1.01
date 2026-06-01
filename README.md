# Church_Hub

Production-ready church community management platform.

## Features

- **Membership** — Digital onboarding, family linking, role & status tracking
- **Follow-Up & Discipleship** — Pipeline stages, automated reminders, pastoral notes
- **Evangelism & Outreach** — Offline-first capture, QR/NFC links, GPS tagging
- **Youth Community** — Groups, events, gamification, parent linking
- **Business Community** — Member directory, marketplace, job board
- **Bus Ministry** — Ride scheduling, route optimization, driver GPS, emergency alerts
- **Communications** — Announcements, sermons, devotionals, notifications
- **Admin Dashboard** — Analytics across all ministries

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS, Prisma, PostgreSQL, Redis, BullMQ |
| Web | Next.js 14, Tailwind CSS, shadcn/ui, PWA |
| Mobile | Expo React Native |
| Infra | Docker, Kubernetes, Terraform, GitHub Actions |

## Getting Started

```bash
# Clone and setup
cd ChurchApp
cp .env.example .env

# Start Postgres, Redis, MinIO
docker compose up -d

# Install dependencies
pnpm install

# Database
pnpm db:generate
pnpm db:migrate
pnpm --filter @church-hub/api prisma:seed

# Development (API + Web)
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3001 |
| API | http://localhost:4000 |
| API docs | http://localhost:4000/api/docs |

**Demo login:** `admin@demo.church` / `ChurchHub123!`

## Mobile App

```bash
cd apps/mobile
pnpm dev
```

## Project Structure

```
apps/
  api/      NestJS backend with domain modules
  web/      Next.js admin & community portal
  mobile/   Expo app (outreach + driver)
packages/
  shared-types/   Shared Zod schemas
infra/
  docker/         Dockerfiles
  kubernetes/     K8s manifests
  terraform/      AWS provisioning
docs/             Architecture & module docs
postman/          API collection
```

## License

Private — All rights reserved.
