#!/bin/bash
cd /home/claude/chyweb; L=/tmp/runall.log; : > $L
for p in $(pgrep -f "[h].py|[g]ateway.py|[p]ostgrest|[n]ext-server"); do kill $p 2>/dev/null; done; sleep 2
bash /tmp/stack.sh >> $L 2>&1
A=$(python3 -c "import json;print(json.load(open('/tmp/h.json'))['anon'])"); S=$(python3 -c "import json;print(json.load(open('/tmp/h.json'))['svc'])")
(NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3005 NEXT_PUBLIC_SUPABASE_ANON_KEY=$A SUPABASE_SERVICE_ROLE_KEY=$S CONTENT_REVALIDATE_SECONDS=2 setsid nohup npx next start -p 3150 >/tmp/app3.log 2>&1 &); sleep 7
echo "app: $(curl -s -o /dev/null -w '%{http_code}' localhost:3150/en)" >> $L
run(){ echo "##### $1" >> $L; shift; timeout 280 "$@" 2>&1 | grep -E "^(FAIL|PART|SUMMARY|DOWN TEST|RESULT)|Traceback|Error:" >> $L; }
run "A: auth, services, projects" python3 /tmp/adm_a.py
python3 /tmp/q.py "delete from services where slug like 'zz-%'" >/dev/null; python3 /tmp/q.py "delete from projects where slug like 'zz-%'" >/dev/null
run "B1: testimonials, FAQs, inquiries, roles, attacks" python3 /tmp/adm_b1.py
run "B5: media" python3 /tmp/adm_b5.py
run "B6: logout + secrets" python3 /tmp/adm_b6.py
run "B4: token refresh/expiry" python3 /tmp/adm_b4.py
bash /tmp/pgrst.sh >/dev/null 2>&1; sleep 1
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3005 NEXT_PUBLIC_SUPABASE_ANON_KEY=$A SUPABASE_SERVICE_ROLE_KEY=$S
run "STAGE 1/2 baseline: verify-supabase" node scripts/verify-supabase.mjs
export VERIFY_ADMIN_EMAIL=admin@chyweb.test VERIFY_ADMIN_PASSWORD=Passw0rd-admin VERIFY_EDITOR_EMAIL=editor@chyweb.test VERIFY_EDITOR_PASSWORD=Passw0rd-editor VERIFY_PLAIN_EMAIL=plain@chyweb.test VERIFY_PLAIN_PASSWORD=Passw0rd-plain
run "verify-admin --write" node scripts/verify-admin.mjs --write
run "STAGE 2 baseline: public content suite" python3 /tmp/app_tests.py
run "DB-down behaviour" python3 /tmp/down.py
echo "##### ALL DONE" >> $L; sleep 300
