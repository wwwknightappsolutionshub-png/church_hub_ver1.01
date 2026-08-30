# Deploy Church Hub on aaPanel — PM2 + native Postgres/Redis

Production uses **PM2 on the host** (same model as your other VPS apps). There is **no Docker** in this project.

**Public URL:** https://church-hub.wazconnect.com  
**Code path:** `/www/wwwroot/church-hub.wazconnect.com`

| Component | How it runs |
|-----------|-------------|
| API | PM2 `church-hub-api` → `127.0.0.1:4000` |
| Web | PM2 `church-hub-web` → `127.0.0.1:3003` |
| Database | Host Postgres `127.0.0.1:5432`, database `churchhub` |
| Redis | Host Redis `127.0.0.1:6379` |
| Nginx | `/api/` → 4000, `/` → 3003 |

---

## One-time setup

### 1 — DNS

Add an **A record**: `church-hub` → your VPS public IP.

### 2 — Clone repo

```bash
mkdir -p /www/wwwroot
cd /www/wwwroot
git clone https://github.com/wwwknightappsolutionshub-png/church_hub_ver1.01.git church-hub.wazconnect.com
cd church-hub.wazconnect.com
```

### 3 — Node 20 + pnpm

```bash
node -v   # v20+
corepack enable && corepack prepare pnpm@9.14.2 --activate
npm install -g pm2
```

### 4 — Postgres database

```bash
sudo -u postgres psql -c "CREATE USER churchhub WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE churchhub OWNER churchhub;"
sudo -u postgres psql -d churchhub -c "GRANT ALL ON SCHEMA public TO churchhub;"
```

### 5 — Environment file

```bash
cp .env.pm2.example .env
nano .env
```

Generate JWT secrets (run twice):

```bash
openssl rand -base64 48
```

Required in `.env`:

- `DATABASE_URL=postgresql://churchhub:...@127.0.0.1:5432/churchhub?schema=public`
- `REDIS_HOST=127.0.0.1`
- `SERVER_API_URL=http://127.0.0.1:4000`
- `NEXT_PUBLIC_API_URL=https://church-hub.wazconnect.com`
- `NEXT_PUBLIC_APP_URL=https://church-hub.wazconnect.com`
- Strong `JWT_*` secrets

### 6 — First deploy

```bash
chmod +x scripts/deploy/vps-update.sh scripts/deploy/vps-verify.sh
./scripts/deploy/vps-update.sh
pm2 save
pm2 startup   # run the command it prints
./scripts/deploy/vps-verify.sh
```

### 7 — aaPanel Nginx + SSL

1. **Website** → add `church-hub.wazconnect.com` (Pure static / no PHP).
2. **SSL** → Let's Encrypt → Force HTTPS.
3. Paste `infra/nginx/church-hub.wazconnect.com.conf.example` into the site config (inside `server { }`).
4. Reload Nginx.

Optional — patch login/register cache headers:

```bash
./scripts/deploy/nginx-patch-login-no-cache.sh
```

---

## Routine updates

The deploy script **stops web, rebuilds standalone, delete+starts web, and exits with an error** if `:3003/login` is not healthy — do not run extra `pm2 start` afterward.

```bash
cd /www/wwwroot/church-hub.wazconnect.com
git pull
./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
```

Deploy a specific branch:

```bash
cd /www/wwwroot/church-hub.wazconnect.com
git fetch origin && git reset --hard origin/feat/your-branch
GIT_BRANCH=feat/your-branch ./scripts/deploy/vps-update.sh
```

If server-local git edits block pull:

```bash
FORCE_GIT_RESET=1 GIT_BRANCH=master ./scripts/deploy/vps-update.sh
```

After deploy: hard-refresh browser (**Ctrl+Shift+R**).

---

## Verify

```bash
pm2 list
curl -s http://127.0.0.1:4000/api/v1/health
curl -s https://church-hub.wazconnect.com/api/v1/health
```

Demo login (after seed): `admin@demo.church` / `ChurchHub123!`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 502 Bad Gateway | Re-run `./scripts/deploy/vps-update.sh` (script auto-starts web; exits 1 if build/health fails). Check `pm2 list`, `test -f apps/web/.next/standalone/apps/web/server.js` |
| API won't start | `pm2 logs church-hub-api` — check `DATABASE_URL` |
| Web 404 on `/_next/` | Re-run `./scripts/deploy/vps-update.sh`; check Nginx `/_next/` block |
| Stale login page | Run `nginx-patch-login-no-cache.sh`; hard-refresh browser |
| `prisma migrate` permission denied | `./scripts/deploy/pm2-fix-db-permissions.sh` |
| Port 4000 in use | `ss -tlnp \| grep 4000` — stop conflicting process |

---

## Architecture

```
Browser → Nginx (443) → 127.0.0.1:3003 (PM2 web)
                      → 127.0.0.1:4000/api/ (PM2 api)
                              ├── Postgres (host)
                              └── Redis (host)
```

---

## Quick reference

| Item | Value |
|------|--------|
| Deploy script | `scripts/deploy/vps-update.sh` |
| Verify script | `scripts/deploy/vps-verify.sh` |
| Env template | `.env.pm2.example` |
| PM2 config | `infra/pm2/ecosystem.config.cjs` |
| Nginx example | `infra/nginx/church-hub.wazconnect.com.conf.example` |
