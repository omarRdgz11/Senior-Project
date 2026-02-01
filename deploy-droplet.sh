#!/bin/bash
# Production deployment on droplet
set -e

echo "=== Pulling latest code ==="
git pull origin production

echo "=== Building frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Verifying frontend/dist exists ==="
ls -lh frontend/dist/index.html

echo "=== Building backend image ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build backend

echo "=== Stopping old containers ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

echo "=== Starting production stack ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "=== Waiting for services to start ==="
sleep 20

echo "=== Running health checks ==="
docker ps

echo ""
echo "Testing API..."
curl -f https://windssight.com/api/ping || echo "❌ API failed"

echo ""
echo "Testing frontend..."
curl -f https://windssight.com/ || echo "❌ Frontend failed"

echo ""
echo "✅ Production deployment complete"
echo "Site: https://windssight.com"
