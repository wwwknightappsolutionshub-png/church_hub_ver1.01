# Devotional Hub — Security Audit (Phase 12)

## Authentication & authorization

| Control | Status | Notes |
|---------|--------|-------|
| JWT bearer on `/devotional-hub/*` | OK | Global `JwtAuthGuard` |
| Church isolation | OK | `@ChurchId()` from token payload |
| Member-scoped writes | OK | Services verify `memberId` |
| Leader-only church challenges | OK | `DevotionalChallengesService` role check |
| Group admin group challenges | OK | Group membership + ADMIN/CO_ADMIN |
| Individual challenges private | OK | Only creator membership |

## Input validation

| Control | Status | Notes |
|---------|--------|-------|
| DTO class-validator | OK | Global `ValidationPipe` whitelist |
| Journal HTML | Review | Rich editor — sanitize on render for public share links |
| File URLs (PDF) | Review | Validate allowed hosts in production |

## Abuse prevention

| Control | Status | Notes |
|---------|--------|-------|
| AI/PDF rate limit | OK | `DevotionalAiThrottleGuard` per user/IP |
| Global API rate limit | Gap | Add `@nestjs/throttler` or edge WAF for all routes |
| Swagger in production | Risk | Disable or protect `/api/docs` behind VPN |

## Data protection

| Control | Status | Notes |
|---------|--------|-------|
| Secrets in env | OK | Never commit `.env` |
| AI artifacts per church | OK | `listArtifacts` filters `churchId` |
| Prayer/journal visibility | OK | Scope enums + membership checks |

## Infrastructure

| Control | Status | Notes |
|---------|--------|-------|
| Helmet | OK | `main.ts` |
| CORS | OK | `CORS_ORIGINS` comma-separated |
| TLS termination | Deploy | Load balancer / ingress |
| DB encryption at rest | Deploy | RDS / managed Postgres |

## Recommendations before go-live

1. Set strong `JWT_*_SECRET` (32+ chars) and rotate on schedule.
2. Set `DEVOTIONAL_AI_RATE_LIMIT=20` (or lower) per user in production.
3. Restrict `CORS_ORIGINS` to production web origin only.
4. Enable automated `pg-backup.sh` cron + test restore quarterly.
5. When enabling real AI: log prompts without PII; cap token usage per church.
6. Scan dependencies: `pnpm audit` in CI.
