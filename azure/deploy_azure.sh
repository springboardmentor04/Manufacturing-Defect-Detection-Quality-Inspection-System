#!/bin/bash
# ==============================================================================
# VisionInspect AI - Azure App Service & Container Apps Deployment Script
# Prerequisites: Azure CLI installed (`az login`)
# ==============================================================================

set -e

RESOURCE_GROUP="rg-visioninspect-prod"
LOCATION="eastus"
ACR_NAME="acrvisioninspect$RANDOM"
APP_SERVICE_PLAN="asp-visioninspect"
APP_NAME="visioninspect-ai-$RANDOM"

echo "========================================================"
echo "🚀 Starting VisionInspect AI Deployment on Microsoft Azure"
echo "========================================================"

# 1. Create Resource Group
echo "📌 Creating Azure Resource Group: ${RESOURCE_GROUP} (${LOCATION})..."
az group create --name ${RESOURCE_GROUP} --location ${LOCATION}

# 2. Create Azure Container Registry (ACR)
echo "📦 Creating Azure Container Registry: ${ACR_NAME}..."
az acr create --resource-group ${RESOURCE_GROUP} --name ${ACR_NAME} --sku Basic --admin-enabled true

# 3. Build & Push Container Image to ACR
echo "🐳 Building Docker container image in Azure Container Registry..."
az acr build --registry ${ACR_NAME} --image visioninspect:latest .

# 4. Create App Service Plan (Linux)
echo "💻 Creating Azure App Service Plan (Linux)..."
az appservice plan create --name ${APP_SERVICE_PLAN} --resource-group ${RESOURCE_GROUP} --sku B1 --is-linux

# 5. Create Web App for Containers
echo "🌐 Creating Azure Web App for Containers..."
ACR_PASSWORD=$(az acr credential show --name ${ACR_NAME} --query "passwords[0].value" -o tsv)

az webapp create \
  --resource-group ${RESOURCE_GROUP} \
  --plan ${APP_SERVICE_PLAN} \
  --name ${APP_NAME} \
  --deployment-container-image-name ${ACR_NAME}.azurecr.io/visioninspect:latest \
  --docker-registry-server-user ${ACR_NAME} \
  --docker-registry-server-password ${ACR_PASSWORD}

# 6. Configure Environment Settings & Port 8000
echo "⚙️ Configuring environment variables..."
az webapp config appsettings set \
  --resource-group ${RESOURCE_GROUP} \
  --name ${APP_NAME} \
  --settings \
    WEBSITES_PORT=8000 \
    MODEL_PATH=models/best.pt \
    UPLOAD_DIRECTORY=storage \
    ALLOWED_ORIGINS="*" \
    JWT_SECRET="azure_prod_jwt_secret_visioninspect_2026"

echo "========================================================"
echo "🎉 SUCCESS: VisionInspect AI is Live on Azure App Service!"
echo "========================================================"
echo "🌐 Public Web Application URL: https://${APP_NAME}.azurewebsites.net/login.html"
echo "💚 API Health Endpoint:       https://${APP_NAME}.azurewebsites.net/health"
echo "========================================================"
