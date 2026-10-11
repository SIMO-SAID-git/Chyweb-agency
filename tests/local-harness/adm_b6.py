import sys,os,subprocess; sys.path.insert(0,'/tmp')
from adm_lib import *
import adm_lib
exec(open('/tmp/adm_b1.py').read().split('async def main')[0].split('import adm_lib, datetime')[1])
def gw_restart(exp):
    subprocess.run("pkill -f '[g]ateway.py'",shell=True); time.sleep(1.5)
    subprocess.Popen(['python3','/tmp/gateway.py','3005'],env=dict(os.environ,EXPIRES=str(exp)),stdout=open('/tmp/gw.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
    for _ in range(20):
        try: urllib.request.urlopen(GW+'/auth/v1/user'); 
        except urllib.error.HTTPError: return
        except Exception: time.sleep(0.5)
async def cookies(ctx): return {c['name']:c for c in await ctx.cookies()}
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(); gw_restart(3600)
        print('=== B6a. Logout'); ctx,page=await login(br,'admin'); old={k:v['value'] for k,v in (await cookies(ctx)).items()}; chk('signed in',bool(old.get('cw_at')))
        await page.goto(B+'/admin'); await page.click('button:has-text("Sign out")'); await page.wait_for_url(re.compile(r'/admin/login'),timeout=8000)
        chk('logout redirects to login and removes the cookies',not [c for c in await ctx.cookies() if c['name'].startswith('cw_')])
        s,_=api('GET','/auth/v1/user',old['cw_at']); chk('the old access token is revoked server-side (cannot be reused)',s==401,s)
        c2=await br.new_context(); await c2.add_cookies([{'name':k,'value':v,'url':B+'/admin','httpOnly':True} for k,v in old.items()]); p2=await c2.new_page(); await p2.goto(B+'/admin/services'); chk('replaying the old cookies after logout does not work',p2.url.endswith('/admin/login'),p2.url)
        print('=== B7. Secrets'); svc=json.load(open('/tmp/h.json'))['svc']
        bad=subprocess.run(f"grep -rlF '{svc}' .next/static | wc -l; grep -rl SUPABASE_SERVICE_ROLE .next/static | wc -l",shell=True,capture_output=True,text=True,cwd='/home/claude/chyweb').stdout.split(); chk('service key / its variable name do not exist in any client JavaScript',bad==['0','0'],bad)
        ctx5,pg5=await login(br,'admin'); leaks=[]; toks=[c['value'] for c in await ctx5.cookies()]; print('   tokens to look for:',len(toks))
        for path in ['/admin','/admin/services','/admin/projects','/admin/testimonials','/admin/faqs','/admin/inquiries','/admin/media']:
            await pg5.goto(B+path); h=await pg5.content()
            if svc in h or any(t in h for t in toks) or 'sb_secret_' in h: leaks.append(path)
        chk('no service key, access token or refresh token in any admin page HTML',len(toks)>=2 and not leaks,leaks)
        print(f'\nPART B3: {adm_lib.P} passed, {adm_lib.F} failed'); print('FAILED:',adm_lib.FAILS); await br.close()
asyncio.run(main())
