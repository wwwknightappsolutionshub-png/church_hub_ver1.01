# Phase 11 — Final production polishing

Strict compliance with the membership outline polishing phase.

## Deliverables

| Requirement | Implementation |
|-------------|----------------|
| **Optimize bundle size** | `next.config.js` → `optimizePackageImports` for `lucide-react`, `recharts`, `date-fns`; Recharts lazy-loaded via `AnalyticsChartsSection` |
| **Lazy loading** | `lib/membership-lazy.tsx` — membership tabs, analytics charts, automation hub, department dashboard |
| **Accessibility (WCAG)** | `SkipToMain`, `#main-content`, `focus-visible`, tab `role`/`aria-selected`, skeleton `aria-label`, reduced motion |
| **Cross-browser** | `.browserslistrc` (Chrome, Firefox, Safari, Edge); mobile input 16px anti-zoom |
| **Skeleton screens** | `DashboardPageSkeleton` on membership, analytics, departments |
| **Animations** | `hub-page-enter` on `.membership-hub-root`; disabled under `prefers-reduced-motion` |
| **PWA offline hardening** | `sw.js` v2 — precache, network-first navigation, offline fallback `/offline`, stale-while-revalidate static |
| **Deployment readiness** | `scripts/membership-phase11/deployment-readiness.mjs`, `run-phase11.ps1` |

## Run

```powershell
pnpm test:membership:phase11
# or
.\scripts\membership-phase11\run-phase11.ps1
```

## Lighthouse (post-build)

With web on port 3001:

```powershell
node scripts/membership-phase10/lighthouse-membership.mjs
```

Target scores: Performance ≥ 80, Accessibility ≥ 90, PWA ≥ 80 (leadership routes).

## Production deploy checklist

1. `pnpm build` (web standalone + API `nest build`)
2. Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
3. `npx prisma migrate deploy` + seed if new church
4. Health: `GET /api/v1/health` → `{ status: "ok" }`
5. Verify PWA install + offline page at `/offline`
