#!/bin/bash
# ==============================================================================
# VisionInspect AI - AWS EC2 Automated 1-Click Deployment Script
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================

set -e

echo "========================================================"
echo "🚀 Starting VisionInspect AI Deployment on AWS EC2"
echo "========================================================"

# 1. System Updates & Essential Tools
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl wget ca-certificates gnupg lsb-release

# 2. Install Docker & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✓ Docker installed successfully!"
fi

# 3. Create Application Directory Structure
APP_DIR="/opt/visioninspect"
echo "📁 Setting up application directory at ${APP_DIR}..."
sudo mkdir -p ${APP_DIR}
sudo chown -R $USER:$USER ${APP_DIR}

# Copy repository content into APP_DIR if executing from project source
if [ -f "Dockerfile" ]; then
    cp -r . ${APP_DIR}/
    cd ${APP_DIR}
else
    echo "⚠️ Dockerfile not found in current dir. Please run script from repository root."
    exit 1
fi

# 4. Generate Production Environment Configuration
echo "🔐 Generating production environment secrets..."
if [ ! -f ".env" ]; then
    cat <<EOT > .env
POSTGRES_DB=visioninspect
POSTGRES_USER=visioninspect
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ALLOWED_ORIGINS=*
MODEL_PATH=models/best.pt
UPLOAD_DIRECTORY=storage
MAX_FILE_SIZE_MB=10
MODEL_VERSION=YOLO-V1
EOT
    echo "✓ Created .env file with secure secrets!"
fi

# 5. Build and Launch Containers
echo "⚙️ Building Docker images and launching VisionInspect AI services..."
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verify Health
echo "🔍 Checking container health status..."
sleep 10
docker compose -f docker-compose.prod.yml ps

PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || echo "localhost")

echo "========================================================"
echo "🎉 SUCCESS: VisionInspect AI is Deployed & Running on AWS!"
echo "========================================================"
echo "🌐 Public Web Application URL: http://${PUBLIC_IP}:8000/login.html"
echo "💚 API Health Endpoint:       http://${PUBLIC_IP}:8000/health"
echo "📚 OpenAPI Documentation:     http://${PUBLIC_IP}:8000/docs"
echo "========================================================"
