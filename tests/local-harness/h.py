import pgserver, psycopg2, subprocess, json, hmac, hashlib, base64, os, sys, time, threading, http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
SECRET='super-secret-jwt-token-with-at-least-32-characters-long'
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def jwt(p): h=b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode());c=b64(json.dumps(p).encode());s=b64(hmac.new(SECRET.encode(),f'{h}.{c}'.encode(),hashlib.sha256).digest());return f'{h}.{c}.{s}'
srv=pgserver.get_server('/tmp/pgdata',cleanup_mode=None); conn=psycopg2.connect(srv.get_uri()); conn.autocommit=True; cur=conn.cursor()
cur.execute("""
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role authenticator login noinherit; grant anon, authenticated, service_role to authenticator;
create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), (nullif(current_setting('request.jwt.claims',true),'')::jsonb)->>'sub')::uuid $$;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text); alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated, service_role, authenticator;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated; grant select on storage.buckets to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
""")
for f in ['0001_init.sql','0002_content_import_keys.sql','0003_admin_cms.sql']: cur.execute(open('/home/claude/chyweb/supabase/migrations/'+f).read())
cur.execute("notify pgrst, 'reload schema'")
anon=jwt({'role':'anon','iss':'supabase'}); svc=jwt({'role':'service_role','iss':'supabase'})
uri='postgresql://authenticator@/postgres?host=/tmp/pgdata'
env=dict(os.environ,PGRST_DB_URI=uri,PGRST_DB_SCHEMAS='public',PGRST_DB_ANON_ROLE='anon',PGRST_JWT_SECRET=SECRET,PGRST_SERVER_PORT='3002',PGRST_DB_POOL='4',PGRST_LOG_LEVEL='warn')
subprocess.Popen(['/tmp/postgrest'],env=env,stdout=open('/tmp/pgrst.log','w'),stderr=subprocess.STDOUT)
class P(BaseHTTPRequestHandler):
    def log_message(self,*a):pass
    def fwd(self):
        if not self.path.startswith('/rest/v1/'): self.send_response(404);self.end_headers();return
        n=int(self.headers.get('content-length',0));body=self.rfile.read(n) if n else None
        h={k:v for k,v in self.headers.items() if k.lower() not in('host','content-length')}
        if 'Authorization' not in h and 'apikey' in h and h['apikey'].count('.')==2: h['Authorization']='Bearer '+h['apikey']
        c=http.client.HTTPConnection('127.0.0.1',3002,timeout=20);c.request(self.command,self.path[len('/rest/v1'):],body,h);r=c.getresponse();d=r.read()
        self.send_response(r.status)
        for k,v in r.getheaders():
            if k.lower() not in('transfer-encoding','connection','content-length'): self.send_header(k,v)
        self.send_header('Content-Length',str(len(d)));self.end_headers()
        if self.command!='HEAD': self.wfile.write(d)
    do_GET=do_POST=do_PATCH=do_DELETE=do_HEAD=fwd
threading.Thread(target=lambda:ThreadingHTTPServer(('127.0.0.1',3003),P).serve_forever(),daemon=True).start()
json.dump({'anon':anon,'svc':svc,'uri':srv.get_uri()},open('/tmp/h.json','w'))
print('ready',flush=True)
while True: time.sleep(3600)
