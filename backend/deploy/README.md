# VPS deployment guide

Two interchangeable paths are documented below. Pick whichever you prefer:

- **Option A — Docker Compose** (simplest, recommended for a single VPS).
- **Option B — Native systemd + nginx + Let's Encrypt** (no Docker on the host).

Both assume a fresh **Ubuntu 22.04** VPS, a DNS A record pointing
`api.<your-domain>` at the VPS, and SSH root access.

---

## Option A — Docker Compose

### 1. Install Docker on the VPS

```bash
ssh root@<vps-ip>
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 2. Copy the deploy bundle

From your laptop, in the `backend/` directory:

```bash
scp Dockerfile docker-compose.prod.yml .env.example deploy/nginx.conf root@<vps-ip>:/opt/spending-tracker/
scp -r prisma src package*.json tsconfig*.json nest-cli.json root@<vps-ip>:/opt/spending-tracker/
```

(Or `git clone` the repo on the VPS — same result.)

### 3. Configure secrets on the VPS

```bash
cd /opt/spending-tracker
cp .env.example .env
nano .env       # fill in DATABASE_URL, JWT_*_SECRET, GOOGLE_*
```

For Postgres, point `DATABASE_URL` at the bundled DB:

```
DATABASE_URL="postgresql://spending:CHANGE_ME@postgres:5432/spending_tracker?schema=public"
```

### 4. Bring it up

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api
```

The API now listens on `127.0.0.1:3000`. Use nginx (Option B step 4) or
Caddy in front of it for TLS.

---

## Option B — Native systemd + nginx + Let's Encrypt

### 1. Install runtime deps

```bash
ssh root@<vps-ip>
apt update && apt install -y curl ca-certificates gnupg postgresql nginx ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

### 2. Create the database

```bash
sudo -u postgres psql <<'EOF'
CREATE USER spending WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE spending_tracker OWNER spending;
EOF
```

### 3. Deploy the app

```bash
adduser --system --group --home /opt/spending-tracker spending
cd /opt/spending-tracker
git clone https://github.com/pourmedia68-lgtm/spending-tracker.git .
cd backend
npm ci
npx prisma migrate deploy
npm run build
chown -R spending:spending /opt/spending-tracker
```

Drop the systemd unit:

```bash
cp deploy/spending-tracker-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now spending-tracker-api
journalctl -u spending-tracker-api -f
```

### 4. nginx + SSL

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/spending-tracker-api
# Edit the file: replace api.example.com with your domain.
ln -s /etc/nginx/sites-available/spending-tracker-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.<your-domain>
```

### 5. Update the Flutter app

In the mobile client config, set:

```
API_BASE_URL=https://api.<your-domain>/api/v1
```

and add the OAuth redirect URI to your Google Cloud Console:
`https://api.<your-domain>/api/v1/auth/google/callback`.
