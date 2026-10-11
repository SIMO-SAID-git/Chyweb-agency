#!/bin/bash
# idempotent: (re)start Postgres+PostgREST (h.py), import content, start gateway (3005)
cd /home/claude/chyweb
if python3 /tmp/q.py "select 1" >/dev/null 2>&1 && curl -s -m 3 -o /dev/null http://127.0.0.1:3005/auth/v1/user; then echo "stack already up"; exit 0; fi
for p in $(pgrep -f "[h].py|[g]ateway.py|[p]ostgrest|[n]ext-server"); do kill $p 2>/dev/null; done; sleep 1
rm -rf /tmp/pgdata /tmp/h.json
(setsid nohup python3 /tmp/h.py >/tmp/h.log 2>&1 &)
for i in $(seq 1 60); do [ -s /tmp/h.json ] && break; sleep 1; done; sleep 3
H=/tmp/h.json
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3003 SUPABASE_SERVICE_ROLE_KEY=$(python3 -c "import json;print(json.load(open('$H'))['svc'])")
node scripts/import-content.mjs --apply 2>&1 | tail -1
(setsid nohup python3 /tmp/gateway.py 3005 >/tmp/gw.log 2>&1 &); sleep 2
echo "stack up: $(python3 /tmp/q.py 'select (select count(*) from projects),(select count(*) from services),(select count(*) from faqs),(select count(*) from profiles)')"
