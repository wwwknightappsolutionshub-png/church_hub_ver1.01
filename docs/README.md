# Church_Hub Documentation

## Architecture

```
ChurchApp/
├── apps/
│   ├── api/       NestJS + Prisma + PostgreSQL + Redis
│   ├── web/       Next.js 14 (App Router) + Tailwind + shadcn/ui
│   └── mobile/    Expo React Native (outreach + driver)
├── packages/
│   └── shared-types/   Zod schemas shared across apps
└── infra/         Docker, Kubernetes, Terraform, CI/CD
```

## Modules

| Module | API Prefix | Description |
|--------|-----------|-------------|
| Membership | `/membership` | Onboarding, families, roles, status pipeline |
| Follow-Up | `/follow-up` | Discipleship pipeline, reminders, pastoral notes |
| Outreach | `/outreach` | QR capture, offline sync, GPS tagging |
| Youth | `/youth` | Groups, events, RSVP, gamification |
| Business | `/business` | Directory, marketplace, jobs |
| Bus | `/bus` | Rides, route optimization, driver GPS |
| Communications | `/communications` | Announcements, sermons, notifications |
| Admin | `/admin` | Analytics dashboard |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop

### Setup

```bash
cd ChurchApp
cp .env.example .env

# Start infrastructure
docker compose up -d

# Install & migrate
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm --filter @church-hub/api prisma:seed

# Run all apps
pnpm dev
```

### URLs
- Web: http://localhost:3001
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs
- MinIO Console: http://localhost:9001

### Demo credentials
- Email: `admin@demo.church`
- Password: `ChurchHub123!`

## Security

- JWT access + refresh token rotation
- RBAC with role/permission tables
- Helmet security headers
- Input validation via Zod + class-validator
- Multi-tenant ready via `churchId` scoping

## Offline Sync

Web and mobile apps queue outreach captures locally when offline.
POST `/api/v1/outreach/sync` processes the queue with conflict detection.

## Route Optimization

`POST /api/v1/bus/routes/optimize` uses nearest-neighbor + 2-opt TSP heuristic.
Configure OSRM via `OSRM_BASE_URL` for production routing.
