using './main.bicep'

param baseName = 'chesslens'
param location = 'eastus2'
param dbPassword = readEnvironmentVariable('DB_PASSWORD', 'ChessL3ns!2026Secure')
param nextAuthSecret = readEnvironmentVariable('NEXTAUTH_SECRET', '')
param lichessClientId = readEnvironmentVariable('LICHESS_CLIENT_ID', '')
param lichessClientSecret = readEnvironmentVariable('LICHESS_CLIENT_SECRET', '')
