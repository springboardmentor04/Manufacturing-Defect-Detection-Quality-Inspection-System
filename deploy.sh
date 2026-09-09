#!/usr/bin/env bash
# ==============================================================================
# VisionInspect AI - Production Deployment & Management Script
# ==============================================================================

set -euo pipefail

RED='\033[0;32m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "============================================================"
    echo "         VisionInspect AI - Docker Deployment Script        "
    echo "============================================================"
    echo -e "${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}[ERROR] Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}[ERROR] Docker daemon is not running. Please start Docker.${NC}"
        exit 1
    fi
}

check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}[!] .env file not found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}[✓] Created .env file. Please review and update credentials.${NC}"
    fi
}

start_production() {
    print_banner
    check_docker
    check_env

    echo -e "${GREEN}[+] Building and starting all production containers...${NC}"
    docker compose up --build -d

    echo -e "${GREEN}[+] Waiting for services to become healthy...${NC}"
    docker compose ps

    echo -e "\n${GREEN}============================================================${NC}"
    echo -e "${GREEN} Deployment Successful!${NC}"
    echo -e "${GREEN} Access Points:${NC}"
    echo -e " - Web Application (Gateway): http://localhost"
    echo -e " - Frontend Direct:          http://localhost:3000"
    echo -e " - Backend Direct API:       http://localhost:8000"
    echo -e " - API Docs (Swagger):       http://localhost:8000/docs"
    echo -e "${GREEN}============================================================${NC}\n"
}

seed_admin() {
    echo -e "${BLUE}[+] Seeding Initial Admin User into PostgreSQL...${NC}"
    docker compose exec backend python -m app.services.seed
}

stop_all() {
    echo -e "${YELLOW}[-] Stopping all containers...${NC}"
    docker compose down
}

show_logs() {
    docker compose logs -f
}

case "${1:-start}" in
    start)
        start_production
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        start_production
        ;;
    logs)
        show_logs
        ;;
    seed)
        seed_admin
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|seed}"
        exit 1
        ;;
esac
