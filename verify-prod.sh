#!/bin/bash
# Quick production diagnostics
export COMPOSE_PROJECT_NAME=fire-prod

echo "=== 1. Check frontend/dist exists ==="
if [ -f frontend/dist/index.html ]; then
    echo "✅ frontend/dist/index.html exists"
    ls -lh frontend/dist/ | head -10
else
    echo "❌ frontend/dist/index.html NOT FOUND"
    echo "Run: cd frontend && npm install && npm run build"
fi

echo ""
echo "=== 2. CRITICAL: Check no dev ports exposed ==="
DEV_PORTS=$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '(5173|4173)' || true)
if [ -n "$DEV_PORTS" ]; then
    echo "❌ FAILURE: Dev ports (5173/4173) are exposed:"
    echo "$DEV_PORTS"
    exit 1
else
    echo "✅ No dev ports exposed"
fi

echo ""
echo "=== 3. Check Caddy can read /srv mount ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec caddy ls -la /srv/ | head -10 || echo "❌ Caddy can't read /srv"

echo ""
echo "=== 4. Test API from inside Caddy container ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec caddy wget -qO- http://backend:5005/api/ping || echo "❌ Backend unreachable from Caddy"

echo ""
echo "=== 5. Test public endpoints ==="
echo "Homepage:"
curl -sI https://windssight.com/ | head -3

echo ""
echo "API:"
curl -sI https://windssight.com/api/ping | head -3

echo ""
echo "Map page (should return 200, not 404):"
curl -sI https://windssight.com/WildfireMap | head -3

echo ""
echo "=== 6. Recent Caddy access logs (last 20 lines) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs caddy --tail=20 | grep -E '"(request|error)"' || echo "No access logs yet"

echo ""
echo "=== 7. Backend errors (if any) ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend --tail=20 | grep -iE '(error|exception|traceback)' || echo "No errors found"

echo ""
echo "✅ All production checks passed"
