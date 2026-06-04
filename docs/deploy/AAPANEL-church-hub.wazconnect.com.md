# Deploy Church Hub on aaPanel — `church-hub.wazconnect.com`

Complete guide assuming you are starting from zero.

> **PM2 + native Postgres/Redis (same as your other VPS apps):** see [PM2-aapanel-migration.md](./PM2-aapanel-migration.md) and `scripts/deploy/pm2-update.sh`.

**What you will have when done:**  
Visitors open **https://church-hub.wazconnect.com** in a browser and use the church app. The API runs on the same address under `/api/v1/...`.

---

## Before you start — what you need

| Item | Notes |
|------|--------|
| **VPS** | Linux server with root/SSH access (Ubuntu 22.04+ recommended), **4 GB RAM** minimum |
| **Domain** | You control DNS for **wazconnect.com** |
| **aaPanel** | Will be installed on the VPS (free control panel) |
| **This guide’s domain** | Subdomain: **church-hub.wazconnect.com** |
| **Time** | First deploy: about 45–90 minutes |

You do **not** need Node.js installed on the host — Docker runs the app.

---

## Part A — DNS (point subdomain to your VPS)

### Step A1 — Find your VPS public IP

In your VPS provider dashboard (DigitalOcean, Vultr, Contabo, etc.), copy the **public IPv4 address** (example: `203.0.113.50`).

### Step A2 — Log in to your domain DNS

Where you bought **wazconnect.com** (Cloudflare, Namecheap, GoDaddy, etc.), open **DNS** / **DNS records**.

### Step A3 — Add an A record

| Field | Value |
|--------|--------|
| **Type** | `A` |
| **Name / Host** | `church-hub` |
| **Value / Points to** | Your VPS IP (e.g. `203.0.113.50`) |
| **TTL** | Auto or `300` |

Save. Wait **5–30 minutes** (sometimes up to a few hours).

### Step A4 — Check DNS (optional)

On your **Windows PC** (PowerShell):

```powershell
nslookup church-hub.wazconnect.com
```

The answer should show your VPS IP.

---

## Part B — Install aaPanel on the VPS

### Step B1 — Connect by SSH

Use **PuTTY**, **Windows Terminal**, or aaPanel’s web SSH.

```bash
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with your real IP. Enter the root password when asked.

### Step B2 — Install aaPanel

```bash
wget -O install.sh https://www.aapanel.com/script/install_6.0_en.sh && sudo bash install.sh aapanel
```

Follow prompts. When finished, the script prints:

- **Panel URL** (e.g. `https://203.0.113.50:8888/xxxxxxxx`)
- **Username** and **password**

Save these in a password manager.

### Step B3 — Log in to aaPanel

1. Open the panel URL in your browser.
2. Log in and set a **strong panel password** if asked.
3. When offered a stack, choose **LNMP** or **Nginx** (you need **Nginx**, not Apache-only).

### Step B4 — Open firewall ports

In aaPanel: **Security** → **Firewall** (or your cloud provider firewall):

| Port | Purpose |
|------|---------|
| `22` | SSH |
| `80` | HTTP (for SSL verification) |
| `443` | HTTPS |
| `8888` | aaPanel (restrict to your home IP if possible) |

Do **not** open `5432`, `4000`, or `3001` to the public internet.

---

## Part C — Install Docker and Git in aaPanel

### Step C1 — Docker

1. **App Store** → search **Docker** → **Install**.
2. Wait until status is **Installed**.

SSH check:

```bash
docker --version
docker compose version
```

Both should print version numbers.

### Step C2 — Git

**App Store** → **Git** → **Install**, or:

```bash
apt update && apt install -y git
```

---

## Part D — Download the application code

### Step D1 — Create folder and clone

In SSH:

```bash
mkdir -p /www/wwwroot
cd /www/wwwroot
git clone https://github.com/wwwknightappsolutionshub-png/church_hub_ver1.01.git churchhub
cd churchhub
ls
```

You should see folders like `apps`, `infra`, `docker-compose.yml`.

If `git clone` fails, install Git (Step C2) or upload a ZIP of the repo via aaPanel **Files**.

---

## Part E — Create production settings (`.env`)

### Step E1 — Copy the example file

```bash
cd /www/wwwroot/churchhub
cp .env.aapanel.example .env
```

### Step E2 — Generate secret keys

Run **twice** (once for access, once for refresh):

```bash
openssl rand -base64 48
```

Copy each output.

### Step E3 — Edit `.env`

```bash
nano .env
```

Set these lines (use your generated secrets):

```env
JWT_ACCESS_SECRET=paste-first-secret-here
JWT_REFRESH_SECRET=paste-second-secret-here
```

Leave the URLs as:

```env
APP_URL=https://church-hub.wazconnect.com
API_URL=https://church-hub.wazconnect.com
CORS_ORIGINS=https://church-hub.wazconnect.com
NEXT_PUBLIC_API_URL=https://church-hub.wazconnect.com
NEXT_PUBLIC_APP_URL=https://church-hub.wazconnect.com
NEXT_PUBLIC_DEMO_MODE=false
```

Save in nano: **Ctrl+O**, Enter, **Ctrl+X**.

---

## Part F — Build and start Docker containers

All commands run from `/www/wwwroot/churchhub`.

### Step F1 — Build images (first time: 15–30 minutes)

```bash
cd /www/wwwroot/churchhub

docker compose \
  -f docker-compose.yml \
  -f infra/docker/docker-compose.prod.yml \
  -f infra/docker/docker-compose.aapanel.yml \
  --env-file .env \
  build --no-cache
```

If the server runs out of memory, add swap:

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

Then run the build again.

### Step F2 — Start containers

```bash
docker compose \
  -f docker-compose.yml \
  -f infra/docker/docker-compose.prod.yml \
  -f infra/docker/docker-compose.aapanel.yml \
  --env-file .env \
  up -d
```

### Step F3 — Check containers are running

```bash
docker ps
```

You should see containers for **postgres**, **redis**, **minio**, **api**, and **web** (names may include `churchhub`).

### Step F4 — Prepare the database

```bash
docker compose \
  -f docker-compose.yml \
  -f infra/docker/docker-compose.prod.yml \
  -f infra/docker/docker-compose.aapanel.yml \
  exec api npx prisma migrate deploy
```

**First deploy only** — load demo data:

```bash
docker compose \
  -f docker-compose.yml \
  -f infra/docker/docker-compose.prod.yml \
  -f infra/docker/docker-compose.aapanel.yml \
  exec api npx prisma db seed
```

### Step F5 — Test on the server (before Nginx)

```bash
curl -s http://127.0.0.1:4000/api/v1/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/
```

Expected: JSON with `"status":"ok"` and web code `200` or `307`.

---

## Part G — Create the website in aaPanel

### Step G1 — Add site

1. **Website** → **Add site**.
2. **Domain:** `church-hub.wazconnect.com`
3. **PHP version:** None / Pure static (this is not a PHP app).
4. Create the site.

### Step G2 — SSL certificate

1. Click the site → **SSL**.
2. **Let's Encrypt** → apply for `church-hub.wazconnect.com`.
3. Turn on **Force HTTPS**.

### Step G3 — Nginx proxy rules (important)

The app needs **two** backends on one domain:

| Path | Goes to |
|------|---------|
| `/api/` | API on port `4000` |
| `/` | Web on port `3001` |

1. Open site **church-hub.wazconnect.com** → **Configuration** (or **Conf**).
2. Find the `server { ... }` block for this domain.
3. **Inside** that block (before the closing `}`), paste the contents of:

   `infra/nginx/church-hub.wazconnect.com.conf.example`

   from the project (the two `location` blocks).

4. Save and **reload Nginx** (button in aaPanel or **Service** → Nginx → Reload).

**Do not** use only a single “reverse proxy to port 3001” — the API would not work.

---

## Part H — Verify in your browser

1. Open **https://church-hub.wazconnect.com**  
   You should see the Church Hub web app.

2. Open **https://church-hub.wazconnect.com/api/v1/health**  
   You should see JSON like: `{"status":"ok",...}`

3. Log in (after seed):  
   - Email: `admin@demo.church`  
   - Password: `ChurchHub123!`  

4. Press **F12** → **Network** → use the app. API calls should go to  
   `https://church-hub.wazconnect.com/api/v1/...`  
   **not** `localhost`.

---

## Part I — Security checklist (production)

- [ ] Change demo password or disable demo mode after testing.
- [ ] Strong `JWT_*` secrets in `.env` (never share or commit `.env`).
- [ ] aaPanel: strong password; restrict port `8888` if possible.
- [ ] Optional: block Swagger — add `location /api/docs { return 404; }` in Nginx.
- [ ] Set up **daily database backup** (aaPanel **Cron** or `pg_dump` — see project `scripts/ops/pg-backup.sh`).

---

## Part J — Updating the app later (no stale builds)

Use the deploy script so Docker always rebuilds images, recreates containers, and runs migrations:

```bash
cd /www/wwwroot/church-hub.wazconnect.com   # or your clone path
chmod +x scripts/deploy/vps-update.sh scripts/deploy/vps-verify.sh
git pull
./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
```

If `git pull` fails because of server-local edits to compose files:

```bash
FORCE_GIT_RESET=1 ./scripts/deploy/vps-update.sh
```

**What the script does**

1. `git pull --ff-only` (or hard reset with `FORCE_GIT_RESET=1`)
2. `docker compose build --no-cache --pull` for **api** and **web** (re-bakes `NEXT_PUBLIC_*`)
3. `docker compose up -d --force-recreate` (new containers, not old ones)
4. `prisma migrate deploy`
5. Prunes dangling images
6. Local `curl` checks for API, login page, and auth image

**After deploy**

- Update aaPanel Nginx from `infra/nginx/church-hub.wazconnect.com.conf.example` if it changed (especially `/_next/`, `/images/`, and HTML `no-store` headers).
- Hard-refresh the browser: **Ctrl+Shift+R** (or clear site data for `church-hub.wazconnect.com`).

If you change `NEXT_PUBLIC_*` in `.env`, you **must** run `./scripts/deploy/vps-update.sh` (not only `up -d`).

---

## Troubleshooting

| Symptom | What to do |
|---------|------------|
| Site does not load | Check DNS (Part A); ping domain; confirm Nginx running |
| **502 Bad Gateway** | `docker ps` — are api/web up? `curl 127.0.0.1:3001` and `:4000` |
| Login works but data fails | Nginx missing `location /api/` block |
| Browser calls `localhost:4000` | Rebuild web: Part F1 with correct `.env`, then `up -d` |
| CORS error | `CORS_ORIGINS` must be exactly `https://church-hub.wazconnect.com` |
| `prisma migrate` fails | `docker logs` on api container; postgres container healthy? |
| Build killed / frozen | Add swap (Part F1); use VPS with more RAM |

View API logs:

```bash
docker compose -f docker-compose.yml -f infra/docker/docker-compose.prod.yml -f infra/docker/docker-compose.aapanel.yml logs api --tail 100
```

---

## Architecture (one subdomain)

```
Browser
   │
   ▼
https://church-hub.wazconnect.com  (aaPanel Nginx + SSL)
   │
   ├─ /api/*  ──► 127.0.0.1:4000  (API container)
   │
   └─ /*      ──► 127.0.0.1:3001  (Web container)
                        │
                        ├── Postgres (database)
                        ├── Redis (cache)
                        └── MinIO (file uploads)
```

---

## Quick reference

| What | Value |
|------|--------|
| Public URL | https://church-hub.wazconnect.com |
| API health | https://church-hub.wazconnect.com/api/v1/health |
| Code on server | `/www/wwwroot/church-hub.wazconnect.com` |
| Env file | `/www/wwwroot/church-hub.wazconnect.com/.env` |
| Fresh deploy | `./scripts/deploy/vps-update.sh` |
| Verify deploy | `./scripts/deploy/vps-verify.sh` |
| Demo login (after seed) | admin@demo.church / ChurchHub123! |
