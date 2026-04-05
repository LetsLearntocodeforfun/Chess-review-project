targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string = 'chesslens'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator password')
@secure()
param dbPassword string

@description('NextAuth secret for session encryption')
@secure()
param nextAuthSecret string

@description('Lichess OAuth Client ID')
param lichessClientId string = ''

@description('Lichess OAuth Client Secret')
@secure()
param lichessClientSecret string = ''

// ============================================================
// Azure OpenAI
// ============================================================
resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${baseName}-openai'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${baseName}-openai'
    publicNetworkAccess: 'Enabled'
  }
}

resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai
  name: 'gpt-4o-mini'
  sku: {
    name: 'GlobalStandard'
    capacity: 30
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
  }
}

// ============================================================
// PostgreSQL Flexible Server
// ============================================================
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${baseName}-db'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'chesslens'
    administratorLoginPassword: dbPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'chesslens'
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ============================================================
// Azure Cache for Redis
// ============================================================
resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: '${baseName}-redis'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// ============================================================
// App Service Plan (shared by web and analysis)
// ============================================================
resource appPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${baseName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: 'B2'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

// ============================================================
// Web App (Next.js Frontend)
// ============================================================
resource webApp 'Microsoft.Web/sites@2024-04-01' = {
  name: '${baseName}-web'
  location: location
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        { name: 'DATABASE_URL', value: 'postgresql://chesslens:${dbPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/chesslens?sslmode=require' }
        { name: 'NEXTAUTH_URL', value: 'https://${baseName}-web.azurewebsites.net' }
        { name: 'NEXTAUTH_SECRET', value: nextAuthSecret }
        { name: 'LICHESS_CLIENT_ID', value: lichessClientId }
        { name: 'LICHESS_CLIENT_SECRET', value: lichessClientSecret }
        { name: 'ANALYSIS_SERVICE_URL', value: 'https://${baseName}-api.azurewebsites.net' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
      ]
      alwaysOn: true
    }
    httpsOnly: true
  }
}

// ============================================================
// API App (Python FastAPI Analysis Service)
// ============================================================
resource apiApp 'Microsoft.Web/sites@2024-04-01' = {
  name: '${baseName}-api'
  location: location
  properties: {
    serverFarmId: appPlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      appCommandLine: 'uvicorn main:app --host 0.0.0.0 --port 8000'
      appSettings: [
        { name: 'DATABASE_URL', value: 'postgresql+asyncpg://chesslens:${dbPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/chesslens?ssl=require' }
        { name: 'REDIS_URL', value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380/0' }
        { name: 'CELERY_BROKER_URL', value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380/1' }
        { name: 'CELERY_RESULT_BACKEND', value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380/2' }
        { name: 'AZURE_OPENAI_API_KEY', value: openai.listKeys().key1 }
        { name: 'AZURE_OPENAI_ENDPOINT', value: 'https://${openai.properties.customSubDomainName}.openai.azure.com/' }
        { name: 'AZURE_OPENAI_DEPLOYMENT', value: 'gpt-4o-mini' }
        { name: 'AZURE_OPENAI_API_VERSION', value: '2024-12-01-preview' }
        { name: 'STOCKFISH_PATH', value: '/usr/games/stockfish' }
        { name: 'STOCKFISH_DEPTH', value: '22' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'WEBSITES_PORT', value: '8000' }
      ]
      alwaysOn: true
    }
    httpsOnly: true
  }
}

// ============================================================
// Outputs
// ============================================================
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output apiAppUrl string = 'https://${apiApp.properties.defaultHostName}'
output openaiEndpoint string = 'https://${openai.properties.customSubDomainName}.openai.azure.com/'
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output redisHost string = redis.properties.hostName
