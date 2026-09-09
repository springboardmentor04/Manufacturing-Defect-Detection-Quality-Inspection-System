# 🚀 VisionInspect AI - Production Deployment & Dockerization Guide

This guide provides end-to-end instructions for running and deploying the **VisionInspect AI** (Quality Inspection System) using Docker, Docker Compose, Nginx, and cloud platforms.

---

## 🏗️ Architecture Overview

The system consists of 4 containerized services:

| Service | Container Name | Technology | Internal Port | Exposed Port | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gateway** | `visioninspect-gateway` | Nginx 1.27 Alpine | 80 | **80 / 443** | Unified reverse proxy routing `/` to Frontend and `/api/` & `/docs` to Backend |
| **Frontend** | `visioninspect-frontend` | Next.js 16 (Standalone) | 3000 | **3000** | Interactive dashboard & inspection UI |
| **Backend** | `visioninspect-backend` | FastAPI + PyTorch CNN | 8000 | **8000** | REST API & defect detection inference engine |
| **Database** | `visioninspect-db` | PostgreSQL 16 Alpine | 5432 | **5432** | Persistent relational database storage |

---

## ⚡ Quick Start (Local Docker Run)

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+) & [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optionally edit `.env` to customize passwords, ports, or JWT secrets)*

### 3. Launch the Entire Stack
You can start all services using the helper script or `docker compose`:

```bash
# Using the deployment helper script:
./deploy.sh start

# Or directly with Docker Compose:
docker compose up --build -d
```

### 4. Seed Initial Admin Account
Once the backend container is running and healthy, seed the database with the default roles and an administrator account:

```bash
docker compose exec backend python -m app.services.seed
```
*Custom admin credentials can also be provided:*
```bash
docker compose exec backend python -m app.services.seed \
  --admin-email "admin@visioninspect.com" \
  --admin-full-name "Lead Quality Inspector" \
  --admin-password "YourStrongPassword123!"
```

### 5. Access the Application
- **Unified Gateway (Recommended):** [http://localhost](http://localhost)
- **Frontend Direct:** [http://localhost:3000](http://localhost:3000)
- **Backend API Direct:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🌐 Production Cloud Deployment (VPS / EC2 / DigitalOcean / Hetzner)

Follow these steps to deploy on any Ubuntu/Debian Linux Server.

### Step 1: Provision Server & Install Docker
Connect to your server via SSH:
```bash
ssh root@your-server-ip
```

Install Docker & Docker Compose:
```bash
# Update package lists
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key and repo
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### Step 2: Clone Repository & Setup Production Config
```bash
git clone https://github.com/your-org/quality-inspection-system.git /opt/quality-inspection-system
cd /opt/quality-inspection-system

# Create production environment file
cp .env.example .env
```

Generate secure production secrets for `.env`:
```bash
# Generate a 64-char JWT secret:
openssl rand -hex 32

# Generate a strong DB password:
openssl rand -hex 16
```

Update `.env` with:
```env
ENVIRONMENT=production
POSTGRES_USER=visioninspect
POSTGRES_PASSWORD=<YOUR_GENERATED_DB_PASSWORD>
JWT_SECRET_KEY=<YOUR_GENERATED_JWT_SECRET>
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### Step 3: Build & Launch Services
```bash
docker compose up --build -d
```

Seed initial admin:
```bash
docker compose exec backend python -m app.services.seed --admin-email admin@your-domain.com --admin-password "SecurePass#2026"
```

---

## 🔒 Enabling Free SSL / HTTPS with Let's Encrypt & Certbot

To attach a domain (e.g. `inspection.yourdomain.com`) with automated SSL certificates:

### Option A: Using Certbot Standalone or Host Nginx
```bash
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL Certificate
sudo certbot certonly --standalone -d inspection.yourdomain.com
```

Then map the generated certificates into the Docker `nginx` container or configure host Nginx reverse-proxying to `http://127.0.0.1:80`.

### Option B: Host Nginx SSL Reverse Proxy
Create `/etc/nginx/sites-available/quality-inspection.conf`:
```nginx
server {
    server_name inspection.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:80; # Points to Docker Nginx Gateway
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Run `sudo certbot --nginx -d inspection.yourdomain.com` to automatically enable HTTPS.

---

## ☁️ Deploying on Managed Cloud PaaS (Render, Railway, Fly.io, Coolify)

### Deploying on Render / Railway:
1. **Database:** Create a managed PostgreSQL database and copy the internal `DATABASE_URL`.
2. **Backend Service:**
   - Source: Dockerfile at `backend/Dockerfile`
   - Context: `./backend`
   - Environment Variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `JWT_SECRET_KEY`: Secure random string
     - `STORAGE_ROOT`: `/app/data/storage`
     - `CORS_ORIGINS`: `["https://your-frontend.com"]`
   - Add persistent disk storage at `/app/data` (for uploaded inspection images).
3. **Frontend Service:**
   - Source: Dockerfile at `Dockerfile` (root)
   - Context: `.`
   - Build Arguments:
     - `NEXT_PUBLIC_API_URL`: `https://your-backend-api.com`

---

## 🗄️ Database Backup & Restore

### Backup PostgreSQL Data
```bash
docker compose exec -T db pg_dump -U visioninspect visioninspect > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore PostgreSQL Data
```bash
docker compose exec -T db psql -U visioninspect -d visioninspect < backup_file.sql
```

---

## 🛠️ Management & Monitoring Commands

| Task | Command |
| :--- | :--- |
| **View Running Containers** | `docker compose ps` |
| **View Live Aggregated Logs** | `docker compose logs -f` |
| **View Backend Logs Only** | `docker compose logs -f backend` |
| **View Frontend Logs Only** | `docker compose logs -f frontend` |
| **Restart Stack** | `docker compose restart` |
| **Rebuild Containers After Code Update** | `docker compose up --build -d` |
| **Stop All Containers** | `docker compose down` |
| **Stop Stack & Wipe Database (Caution)** | `docker compose down -v` |
| **Run Python Shell in Backend** | `docker compose exec backend python` |
| **Inspect Backend Health** | `curl -i http://localhost:8000/health` |
