#!/bin/sh
# Cron script to call cleanup endpoint
# Railway Cron service will execute this on schedule

# Get the app URL from environment (Railway provides this for services in same project)
APP_URL="${RAILWAY_PUBLIC_DOMAIN:-http://localhost:3000}"
CLEANUP_ENDPOINT="${APP_URL}/api/cleanup"

# Optional: Add API key authentication
# API_KEY="${CLEANUP_API_KEY}"

echo "Triggering cleanup at $(date)"
echo "Endpoint: ${CLEANUP_ENDPOINT}"

# Call the cleanup endpoint
response=$(curl -s -w "\n%{http_code}" -X POST "${CLEANUP_ENDPOINT}" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "Cleanup successful: $body"
  exit 0
else
  echo "Cleanup failed with HTTP $http_code: $body"
  exit 1
fi
