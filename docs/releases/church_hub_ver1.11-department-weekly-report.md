# Church Hub 1.11 — department weekly report

Unit leaders preview a week range and send one report to the church admin and pastor. The unit home shows attendance as a line graph, labels the session card This Month, and moves membership consistency into the workspace menu.

The send path checks unit membership, keeps member emails off the dashboard, and does not copy the report to unit members. Public outreach registration requires consent. Date and select controls stay inside their fields, and every service-unit page uses one header.

## Deploy

```bash
cd /www/wwwroot/church-hub.wazconnect.com
git fetch origin && git reset --hard origin/feat/pwa-install-gate-mobile
GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
pnpm --dir apps/api exec ts-node --transpile-only scripts/seed-department-report-release.ts
```

Health `build` should be this commit. The release seed is safe to run once.
