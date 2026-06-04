# Church Hub on aaPanel — PM2 + native Postgres/Redis

Use this when you want **the same ops model as your other VPS apps** (PM2 + host Postgres/Redis), instead of Docker for web/api/db.

**Your server already has:** Postgres `127.0.0.1:5432`, Redis `127.0.0.1:6379`, PM2 apps on other ports.  
**Church Hub will use:** API `127.0.0.1:4000`, Web `127.0.0.1:3003` (Nginx unchanged).

---

## Overview

| Component | PM2 setup |
|-----------|-----------|
| API | `church-hub-api` → `apps/api/dist/src/main.js` |
| Web | `church-hub-web` → `next start -p 3003` |
| Database | Host Postgres, database `churchhub` |
| Redis | Host Redis `127.0.0.1:6379` |
| MinIO (optional) | Keep **one** small Docker container for uploads, or use S3/R2 later |
| Nginx | Still proxy `/` → 3003, `/api/` → 4000 |

---

## Part 1 — One-time: move data off Docker Postgres (if you used Docker before)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
chmod +x scripts/deploy/pm2-migrate-db-from-docker.sh
./scripts/deploy/pm2-migrate-db-from-docker.sh
```

Create DB on **host** Postgres (adjust user/password):

```bash
# aaPanel: often /www/server/pgsql/bin/psql -U postgres ...
sudo -u postgres psql -c "CREATE USER churchhub WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE churchhub OWNER churchhub;"
# Import as churchhub so Prisma can write _prisma_migrations (not as postgres superuser)
sudo -u postgres psql -d churchhub -c "GRANT ALL ON SCHEMA public TO churchhub;"
psql -U churchhub -d churchhub -f /tmp/churchhub-docker-XXXXXXXX.sql
```

If you already imported as `postgres` and `prisma migrate deploy` fails with **permission denied for table _prisma_migrations**:

```bash
chmod +x scripts/deploy/pm2-fix-db-permissions.sh
./scripts/deploy/pm2-fix-db-permissions.sh
cd apps/api && npx prisma migrate deploy
```

---

## Part 2 — Environment file

```bash
cp .env.pm2.example .env
nano .env
```

Required:

- `DATABASE_URL=postgresql://churchhub:...@127.0.0.1:5432/churchhub?schema=public`
- `REDIS_HOST=127.0.0.1`
- `SERVER_API_URL=http://127.0.0.1:4000`
- `NEXT_PUBLIC_API_URL=https://church-hub.wazconnect.com`
- `NEXT_PUBLIC_APP_URL=https://church-hub.wazconnect.com`
- Strong `JWT_*` secrets

---

## Part 3 — Node 20 + pnpm on the VPS (if not installed)

```bash
node -v   # should be v20+
corepack enable && corepack prepare pnpm@9.14.2 --activate
```

---

## Part 4 — Stop Church Hub Docker (free RAM; keep other containers)

```bash
cd /www/wwwroot/church-hub.wazconnect.com

docker compose \
  -f docker-compose.yml \
  -f infra/docker/docker-compose.prod.yml \
  -f infra/docker/docker-compose.aapanel.yml \
  --env-file .env \
  stop web api postgres redis

# Optional: leave MinIO for S3-compatible uploads
# docker compose ... stop minio   # only if you moved uploads to S3/local
```

Do **not** remove volumes until host DB is verified.

---

## Part 5 — First PM2 deploy

```bash
cd /www/wwwroot/church-hub.wazconnect.com
chmod +x scripts/deploy/pm2-update.sh
./scripts/deploy/pm2-update.sh
pm2 save
pm2 startup   # follow printed command so PM2 survives reboot
```

Check:

```bash
pm2 list
curl -s http://127.0.0.1:4000/api/v1/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3003/login
```

Public:

```bash
curl -s https://church-hub.wazconnect.com/api/v1/health
```

---

## Part 6 — Updates (routine)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
git pull
./scripts/deploy/pm2-update.sh
```

Faster than Docker: no image rebuild; only `pnpm build` + `pm2 reload`.

### Stale login page / demo accounts still visible

If `bash scripts/deploy/vps-verify.sh` warns that **public** login HTML references an old `page-*.js` chunk but **PM2** serves a newer one, aaPanel/Nginx is caching HTML. In the site config, ensure:

- `location ^~ /_next/` → proxy to `127.0.0.1:3003` (static JS)
- `location /` → proxy to `127.0.0.1:3003` with `Cache-Control: no-store` on HTML (see `infra/nginx/church-hub.wazconnect.com.conf.example`)

Then reload Nginx and hard-refresh the browser (or unregister the service worker).

---

## Nginx (aaPanel)

Keep the same proxy targets:

- `location ^~ /api/` → `http://127.0.0.1:4000/api/`
- `location ^~ /_next/` and `^~ /images/` → `http://127.0.0.1:3003`
- `location /` → `http://127.0.0.1:3003`

Use `infra/nginx/church-hub.wazconnect.com.conf.example` (HTML `no-store` headers).

---

## Optional: MinIO only in Docker

```bash
docker compose -f docker-compose.yml up -d minio minio-init
```

Point `.env` `S3_ENDPOINT=http://127.0.0.1:9000` if MinIO publishes port 9000 on host.

---

## Rollback to Docker

```bash
pm2 stop church-hub-api church-hub-web
docker compose ... up -d web api postgres redis
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API won’t start | `pm2 logs church-hub-api` — check `DATABASE_URL`, migrations |
| Web 404 on `/_next/` | Re-run `pnpm --filter @church-hub/web build`; check Nginx `/_next/` |
| `/c/demo-church` 404 | `SERVER_API_URL=http://127.0.0.1:4000` in `.env`, rebuild web |
| Redis errors | `REDIS_HOST=127.0.0.1`, `REDIS_ENABLED=true` |
| Port in use | `ss -tlnp \| grep 4000` — stop Docker `api` container first |

---

## Quick reference

| Item | Value |
|------|--------|
| PM2 API name | `church-hub-api` |
| PM2 Web name | `church-hub-web` |
| Ecosystem file | `infra/pm2/ecosystem.config.cjs` |
| Deploy script | `scripts/deploy/pm2-update.sh` |
| Env template | `.env.pm2.example` |
