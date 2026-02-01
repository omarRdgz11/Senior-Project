#!/bin/bash
# Quick production diagnostics
echo "=== 1. Check frontend/dist exists ==="
if [ -f frontend/dist/index.html ]; then
    echo "✅ frontend/dist/index.html exists"
    ls -lh frontend/dist/ | head -10
else
    echo "❌ frontend/dist/index.html NOT FOUND"
    echo "Run: cd frontend && npm install && npm run build"
fi

echo ""
echo "=== 2. Check Caddy can read /srv mount ==="
docker exec fire-caddy ls -la /srv/ | head -10 || echo "❌ Caddy can't read /srv"

echo ""
echo "=== 3. Test API from inside Caddy container ==="
docker exec fire-caddy wget -qO- http://backend:5005/api/ping || echo "❌ Backend unreachable from Caddy"

echo ""
echo "=== 4. Test public endpoints ==="
echo "Homepage:"
curl -sI https://windssight.com/ | head -3

echo ""
echo "API:"
curl -sI https://windssight.com/api/ping | head -3

echo ""
echo "Map page (should return 200, not 404):"
curl -sI https://windssight.com/WildfireMap | head -3

echo ""
echo "=== 5. Recent Caddy access logs (last 20 lines) ==="
docker logs fire-caddy 2>&1 | grep -E '"(request|error)"' | tail -20 || echo "No access logs yet"

echo ""
echo "=== 6. Backend errors (if any) ==="
docker logs fire-backend 2>&1 | grep -iE '(error|exception|traceback)' | tail -10 || echo "No errors found"
