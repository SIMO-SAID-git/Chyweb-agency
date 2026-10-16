# TEST DOUBLE for Supabase's gateway: /rest/v1 -> real PostgREST; /auth/v1 + /storage/v1 emulate the GoTrue / Storage API contracts.
# (Only used in my sandbox. Real Auth/Storage are NOT exercised by these tests.)
import json,hmac,hashlib,base64,time,os,re,uuid,http.client,secrets,psycopg2,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
SECRET='super-secret-jwt-token-with-at-least-32-characters-long'; EXP=int(os.environ.get('EXPIRES','3600'))
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def unb64(s): return base64.urlsafe_b64decode(s+'='*(-len(s)%4))
def sign(p): h=b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode());c=b64(json.dumps(p).encode());return f'{h}.{c}.'+b64(hmac.new(SECRET.encode(),f'{h}.{c}'.encode(),hashlib.sha256).digest())
def verify(t):
    try:
        h,c,s=t.split('.');ok=hmac.compare_digest(s,b64(hmac.new(SECRET.encode(),f'{h}.{c}'.encode(),hashlib.sha256).digest()));p=json.loads(unb64(c))
        return p if ok and p.get('exp',0)>time.time() and p.get('sid') not in REVOKED else None
    except Exception:return None
H=json.load(open('/tmp/h.json')); db=psycopg2.connect(H['uri']);db.autocommit=True
ids={'admin':'11111111-1111-1111-1111-111111111111','editor':'22222222-2222-2222-2222-222222222222','plain':'33333333-3333-3333-3333-333333333333'}
USERS={f'{k}@chyweb.test':(k,v,'Passw0rd-'+k) for k,v in ids.items()}
cu=db.cursor()
for e,(k,i,pw) in USERS.items(): cu.execute("insert into auth.users(id,email) values(%s,%s) on conflict do nothing",(i,e))
cu.execute("insert into public.profiles(id,email,role) values (%s,'admin@chyweb.test','admin'),(%s,'editor@chyweb.test','editor') on conflict do nothing",(ids['admin'],ids['editor']))
REVOKED=set();REFRESH={};UPTOK={};OBJ={};USED={}
def is_staff(sub):
    c=db.cursor();c.execute("begin");c.execute("set local role authenticated");c.execute("select set_config('request.jwt.claim.sub',%s,true)",(sub,));c.execute("select public.is_staff()");r=c.fetchone()[0];c.execute("rollback");return r
def issue(email):
    k,i,_=USERS[email];sid=str(uuid.uuid4());now=int(time.time())
    at=sign({'sub':i,'email':email,'role':'authenticated','aud':'authenticated','iat':now,'exp':now+EXP,'sid':sid});rt=secrets.token_urlsafe(24);REFRESH[rt]=(email,sid)
    return {'access_token':at,'token_type':'bearer','expires_in':EXP,'refresh_token':rt,'user':{'id':i,'email':email}}
class G(BaseHTTPRequestHandler):
    def log_message(self,*a):pass
    def j(self,c,b=None,h=None):
        self.send_response(c);self.send_header('Content-Type','application/json');self.send_header('Access-Control-Allow-Origin','*')
        for k,v in (h or {}).items():self.send_header(k,v)
        d=json.dumps(b).encode() if b is not None else b'';self.send_header('Content-Length',str(len(d)));self.end_headers();self.wfile.write(d)
    def raw(self):
        n=int(self.headers.get('content-length',0));return self.rfile.read(n) if n else b''
    def tok(self):
        a=self.headers.get('Authorization','');return a[7:] if a.startswith('Bearer ') else ''
    def go(self):
        u=urlparse(self.path);p=u.path;q=parse_qs(u.query)
        if p.startswith('/rest/v1/'):
            body=self.raw();h={k:v for k,v in self.headers.items() if k.lower() not in('host','content-length')}
            if 'Authorization' not in h and 'apikey' in h and h['apikey'].count('.')==2:h['Authorization']='Bearer '+h['apikey']
            c=http.client.HTTPConnection('127.0.0.1',3002,timeout=20);c.request(self.command,self.path[len('/rest/v1'):],body or None,h);r=c.getresponse();d=r.read();self.send_response(r.status)
            for k,v in r.getheaders():
                if k.lower() not in('transfer-encoding','connection','content-length'):self.send_header(k,v)
            self.send_header('Content-Length',str(len(d)));self.end_headers()
            if self.command!='HEAD':self.wfile.write(d)
            return
        if p=='/auth/v1/token':
            b=json.loads(self.raw() or b'{}');gt=q.get('grant_type',[''])[0]
            if gt=='password':
                e=b.get('email','');u_=USERS.get(e)
                return self.j(200,issue(e)) if u_ and hmac.compare_digest(u_[2],b.get('password','')) else self.j(400,{'error':'invalid_grant','error_description':'Invalid login credentials'})
            if gt=='refresh_token':
                tok=b.get('refresh_token',''); r=REFRESH.pop(tok,None)
                if r and r[1] not in REVOKED:
                    resp=issue(r[0]); USED[tok]=(time.time(),resp); return self.j(200,resp)
                u=USED.get(tok)   # Supabase 'refresh token reuse interval' (default 10 s): a just-used token returns the same new session
                if u and time.time()-u[0]<10 and u[1]['user'] and True: return self.j(200,u[1])
                return self.j(400,{'error':'invalid_grant','error_description':'Invalid Refresh Token'})
            return self.j(400,{})
        if p=='/auth/v1/user':
            c=verify(self.tok());return self.j(200,{'id':c['sub'],'email':c['email']}) if c else self.j(401,{'msg':'invalid JWT'})
        if p=='/auth/v1/logout':
            c=verify(self.tok())
            if c:REVOKED.add(c['sid'])
            return self.j(204)
        if p=='/storage/v1/object/list/media' and self.command=='POST':
            c=verify(self.tok()); b=json.loads(self.raw() or b'{}')
            if not c or not is_staff(c['sub']):return self.j(403,{'message':'forbidden'})
            pre=b.get('prefix','').rstrip('/')+'/' if b.get('prefix') else ''; sr=b.get('search','')
            return self.j(200,[{'name':k[len(pre):]} for k in OBJ if k.startswith(pre) and '/' not in k[len(pre):] and sr in k[len(pre):]])
        m=re.match(r'/storage/v1/object/(upload/sign|info|public)?/?media/(.+)$',p) or re.match(r'/storage/v1/object/()media/(.+)$',p)
        if p=='/storage/v1/bucket/media':return self.j(200,{'id':'media','public':True,'file_size_limit':5242880,'allowed_mime_types':['image/jpeg','image/png','image/webp','image/avif']})
        if m:
            kind,path=m.group(1) or '',m.group(2)
            if kind=='upload/sign' and self.command=='POST':
                c=verify(self.tok())
                if not c or not is_staff(c['sub']):self.raw();return self.j(403,{'statusCode':'403','error':'Unauthorized','message':'new row violates row-level security policy'})
                t=secrets.token_urlsafe(16);UPTOK[t]=path;self.raw();return self.j(200,{'url':f'/object/upload/sign/media/{path}?token={t}'})
            if kind=='upload/sign' and self.command=='PUT':
                t=q.get('token',[''])[0]
                if UPTOK.get(t)!=path:self.raw();return self.j(401,{'message':'invalid token'})
                body=self.raw();ct=self.headers.get('Content-Type','')
                if ct not in('image/jpeg','image/png','image/webp','image/avif'):return self.j(415,{'message':'mime type not supported'})
                if len(body)>5242880:return self.j(413,{'message':'The object exceeded the maximum allowed size'})
                OBJ[path]=(body,ct);del UPTOK[t];return self.j(200,{'Key':'media/'+path})
            if kind=='info':
                c=verify(self.tok())
                if not c or not is_staff(c['sub']):return self.j(403,{'message':'forbidden'})
                o=OBJ.get(path);return self.j(200,{'name':path,'size':len(o[0]),'metadata':{'size':len(o[0]),'mimetype':o[1]}}) if o else self.j(404,{'message':'Object not found'})
            if kind=='public' and self.command=='GET':
                o=OBJ.get(path)
                if not o:return self.j(404,{})
                self.send_response(200);self.send_header('Content-Type',o[1]);self.send_header('Content-Length',str(len(o[0])));self.end_headers();return self.wfile.write(o[0])
            if kind=='' and self.command=='DELETE':
                c=verify(self.tok())
                if not c or not is_staff(c['sub']):return self.j(403,{'message':'forbidden'})
                if not os.environ.get('NODELETE'):OBJ.pop(path,None)   # NODELETE=1 simulates a Storage that answers 200 but keeps the file
                return self.j(200,{'message':'Successfully deleted'})
        if p=='/_objects':return self.j(200,{k:len(v[0]) for k,v in OBJ.items()})
        self.j(404,{'message':'not found'})
    def do_OPTIONS(self):
        self.send_response(204);self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,PATCH,OPTIONS');self.send_header('Access-Control-Allow-Headers','*');self.end_headers()
    do_GET=do_POST=do_PUT=do_PATCH=do_DELETE=do_HEAD=go
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),G).serve_forever()
