#!/bin/bash

echo "🧪 Testing FixtureCast Automation System"
echo "========================================"

# Test the API endpoints
echo ""
echo "📡 Testing API Endpoints:"
echo "1. Testing /api/update-predictions..."
curl -s -X POST https://fixturecast.com/api/update-predictions \
  -H "Authorization: Bearer fixturecast-lambda-secure-2024-key" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"manual_test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}' | jq '.' || echo "❌ Endpoint not responding"

echo ""
echo "2. Testing /api/update-results..."  
curl -s -X POST https://fixturecast.com/api/update-results \
  -H "Authorization: Bearer fixturecast-lambda-secure-2024-key" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"manual_test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}' | jq '.' || echo "❌ Endpoint not responding"

echo ""
echo "✅ API endpoint tests complete!"
