# ChessLens Azure Deployment Script
# Deploys: App Service Plan, Web App (Next.js), API App (FastAPI), PostgreSQL, Redis
# Reuses existing Azure OpenAI resource

param(
    [string]$ResourceGroup = "rg-chesslens",
    [string]$Location = "eastus2",
    [string]$BaseName = "chesslens",
    [string]$DbPassword = "ChessL3ns2026!Secure"
)

$ErrorActionPreference = "Stop"

Write-Host "=== ChessLens Azure Deployment ===" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup"
Write-Host "Location: $Location"
Write-Host ""

# 1. App Service Plan
Write-Host "[1/5] Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name "$BaseName-plan" `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku B2 `
    --is-linux `
    --output none 2>&1

Write-Host "  ✓ App Service Plan created" -ForegroundColor Green

# 2. PostgreSQL Flexible Server
Write-Host "[2/5] Creating PostgreSQL Flexible Server..." -ForegroundColor Yellow
az postgres flexible-server create `
    --name "$BaseName-db" `
    --resource-group $ResourceGroup `
    --location $Location `
    --admin-user chesslens `
    --admin-password $DbPassword `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --storage-size 32 `
    --version 16 `
    --yes `
    --output none 2>&1

# Create database
az postgres flexible-server db create `
    --resource-group $ResourceGroup `
    --server-name "$BaseName-db" `
    --database-name chesslens `
    --output none 2>&1

# Allow Azure services
az postgres flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name "$BaseName-db" `
    --rule-name AllowAzure `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 `
    --output none 2>&1

Write-Host "  ✓ PostgreSQL created" -ForegroundColor Green

# 3. Redis Cache
Write-Host "[3/5] Creating Azure Cache for Redis..." -ForegroundColor Yellow
az redis create `
    --name "$BaseName-redis" `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Basic `
    --vm-size C0 `
    --output none 2>&1

Write-Host "  ✓ Redis created" -ForegroundColor Green

# 4. Web App (Next.js)
Write-Host "[4/5] Creating Web App (Next.js)..." -ForegroundColor Yellow
az webapp create `
    --name "$BaseName-web" `
    --resource-group $ResourceGroup `
    --plan "$BaseName-plan" `
    --runtime "NODE:20-lts" `
    --output none 2>&1

Write-Host "  ✓ Web App created" -ForegroundColor Green

# 5. API App (FastAPI)
Write-Host "[5/5] Creating API App (FastAPI)..." -ForegroundColor Yellow
az webapp create `
    --name "$BaseName-api" `
    --resource-group $ResourceGroup `
    --plan "$BaseName-plan" `
    --runtime "PYTHON:3.12" `
    --output none 2>&1

Write-Host "  ✓ API App created" -ForegroundColor Green

# Get connection strings
$pgHost = az postgres flexible-server show --name "$BaseName-db" --resource-group $ResourceGroup --query "fullyQualifiedDomainName" -o tsv
$redisHost = az redis show --name "$BaseName-redis" --resource-group $ResourceGroup --query "hostName" -o tsv
$redisKey = az redis list-keys --name "$BaseName-redis" --resource-group $ResourceGroup --query "primaryKey" -o tsv

# Configure Web App settings
Write-Host ""
Write-Host "Configuring Web App settings..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name "$BaseName-web" `
    --resource-group $ResourceGroup `
    --settings `
        DATABASE_URL="postgresql://chesslens:${DbPassword}@${pgHost}:5432/chesslens?sslmode=require" `
        NEXTAUTH_URL="https://$BaseName-web.azurewebsites.net" `
        NEXTAUTH_SECRET="$(openssl rand -base64 32 2>$null || [guid]::NewGuid().ToString())" `
        ANALYSIS_SERVICE_URL="https://$BaseName-api.azurewebsites.net" `
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    --output none 2>&1

# Configure API App settings
Write-Host "Configuring API App settings..." -ForegroundColor Yellow
$openaiKey = az cognitiveservices account keys list --name openai-leasecheck --resource-group rg-leasecheck --query "key1" -o tsv
$openaiEndpoint = az cognitiveservices account show --name openai-leasecheck --resource-group rg-leasecheck --query "properties.endpoint" -o tsv

az webapp config appsettings set `
    --name "$BaseName-api" `
    --resource-group $ResourceGroup `
    --settings `
        DATABASE_URL="postgresql+asyncpg://chesslens:${DbPassword}@${pgHost}:5432/chesslens?ssl=require" `
        REDIS_URL="rediss://:${redisKey}@${redisHost}:6380/0" `
        CELERY_BROKER_URL="rediss://:${redisKey}@${redisHost}:6380/1" `
        CELERY_RESULT_BACKEND="rediss://:${redisKey}@${redisHost}:6380/2" `
        AZURE_OPENAI_API_KEY="$openaiKey" `
        AZURE_OPENAI_ENDPOINT="$openaiEndpoint" `
        AZURE_OPENAI_DEPLOYMENT="gpt-4.1-mini" `
        AZURE_OPENAI_API_VERSION="2024-12-01-preview" `
        STOCKFISH_PATH="/usr/games/stockfish" `
        STOCKFISH_DEPTH="22" `
        WEBSITES_PORT="8000" `
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" `
    --output none 2>&1

az webapp config set `
    --name "$BaseName-api" `
    --resource-group $ResourceGroup `
    --startup-file "uvicorn main:app --host 0.0.0.0 --port 8000" `
    --output none 2>&1

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Resources created in '$ResourceGroup':" -ForegroundColor Cyan
Write-Host "  Web App:    https://$BaseName-web.azurewebsites.net"
Write-Host "  API App:    https://$BaseName-api.azurewebsites.net"
Write-Host "  PostgreSQL: $pgHost"
Write-Host "  Redis:      $redisHost"
Write-Host "  OpenAI:     $openaiEndpoint (reusing existing)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy code: az webapp up --name $BaseName-web --src-path apps/web"
Write-Host "  2. Deploy API:  az webapp up --name $BaseName-api --src-path apps/analysis"
Write-Host "  3. Run migrations in the web app"
