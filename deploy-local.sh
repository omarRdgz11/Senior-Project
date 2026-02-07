#!/bin/bash
# Local production deployment test
set -e

export COMPOSE_PROJECT_NAME=fire-local-prod

echo "=== Stopping existing containers ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans

echo "=== Building frontend locally ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Verifying frontend/dist exists ==="
ls -lh frontend/dist/index.html

echo "=== Building backend image ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend

echo "=== Starting production stack ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

echo "=== Waiting for services to start ==="
sleep 15

echo "=== Running health checks ==="
docker ps

echo ""
echo "Testing API..."
curl -f http://localhost/api/ping || echo "❌ API failed"

echo ""
echo "Testing frontend..."
curl -f http://localhost/ || echo "❌ Frontend failed"

echo ""
echo "✅ Local production deployment complete"
echo "Access at: http://localhost"
