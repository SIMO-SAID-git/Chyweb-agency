import asyncio,json,re,time,uuid,urllib.request,urllib.error,http.client,psycopg2
from urllib.parse import urlparse
from playwright.async_api import async_playwright
B='http://localhost:3150'; GW='http://127.0.0.1:3005'
db=psycopg2.connect(json.load(open('/tmp/h.json'))['uri']);db.autocommit=True;cu=db.cursor()
def q(sql,*a): cu.execute(sql,a or None); 
def one(sql,*a): cu.execute(sql,a or None); r=cu.fetchone(); return r[0] if r else None
P=F=0; FAILS=[]
def chk(n,ok,info=''):
    global P,F
    ok=bool(ok); P+=ok; F+=(not ok); print(('PASS ' if ok else 'FAIL ')+n+('' if ok else f'  <-- {info}'),flush=True)
    if not ok: FAILS.append(n)
def _get(path):
    try: r=urllib.request.urlopen(B+path,timeout=30); return r.status,r.read().decode()
    except urllib.error.HTTPError as e: return e.code,e.read().decode()
def pub(path):
    # Next serves the previous version ONCE while it regenerates in the background after revalidatePath (measured: fresh ~0.3s later).
    # A real first visitor triggers that refresh, so the test does the same: one warm-up hit, then the real read.
    _get(path); time.sleep(0.6); return _get(path)
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*a,**k): return None
def raw(path,headers=None,method='GET',data=None):
    op=urllib.request.build_opener(NoRedir); r=urllib.request.Request(B+path,data=data,headers=headers or {},method=method)
    try: x=op.open(r,timeout=30); return x.status,dict(x.headers),x.read().decode()
    except urllib.error.HTTPError as e: return e.code,dict(e.headers),e.read().decode()
async def setv(page,name,val):
    await page.evaluate("""([n,v])=>{const el=document.querySelector(`[name="${n}"]`);const s=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))}""",[name,val])
async def login(browser,who='admin',pw=None):
    ctx=await browser.new_context(viewport={'width':1280,'height':900}); page=await ctx.new_page(); page.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    await page.goto(B+'/admin/login'); await page.fill('[name=email]',f'{who}@chyweb.test'); await page.fill('[name=password]',pw or f'Passw0rd-{who}'); await page.click('button[type=submit]')
    try: await page.wait_for_url(re.compile(r'/admin($|\?)'),timeout=8000)
    except Exception: pass
    return ctx,page
