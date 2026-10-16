import sys,os,subprocess; sys.path.insert(0,'/tmp')
from adm_lib import *
import adm_lib
def gw_restart(exp):
    subprocess.run("pkill -f '[g]ateway.py'",shell=True); time.sleep(1.5)
    subprocess.Popen(['python3','/tmp/gateway.py','3005'],env=dict(os.environ,EXPIRES=str(exp)),stdout=open('/tmp/gw.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
    for _ in range(20):
        try: urllib.request.urlopen(GW+'/auth/v1/user')
        except urllib.error.HTTPError: return
        except Exception: time.sleep(0.5)
async def ck(ctx,n): return {c['name']:c for c in await ctx.cookies()}.get(n,{}).get('value','')
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(); gw_restart(45)
        cA,pA=await login(br,'admin'); cB,pB=await login(br,'admin'); cC,pC=await login(br,'admin')
        aA,aB=await ck(cA,'cw_at'),await ck(cB,'cw_at'); print('logged in 3 sessions with 45 s access tokens:',bool(aA and aB))
        rt=[c for c in await cC.cookies() if c['name']=='cw_rt'][0]; await cC.add_cookies([{'name':'cw_rt','value':'garbage-refresh-token','domain':rt['domain'],'path':rt['path'],'httpOnly':True,'sameSite':rt['sameSite']}])
        await asyncio.sleep(21); await pA.goto(B+'/admin/services'); a1=await ck(cA,'cw_at')
        chk('NEAR expiry (<30 s left): token silently renewed, page still works, new token issued',await pA.locator('tbody tr').count()==6 and a1!=aA,(pA.url,a1==aA))
        await asyncio.sleep(31); print('   (session B access cookie expired in the browser:', await ck(cB,'cw_at')=='' ,')')
        await pB.goto(B+'/admin/services'); b1=await ck(cB,'cw_at'); chk('AFTER full expiry: session restored from the refresh token, page works, new token',await pB.locator('tbody tr').count()==6 and b1 not in('',aB),(pB.url,))
        await pC.goto(B+'/admin/services'); chk('AFTER expiry with an invalid refresh token: redirected to login, no admin content',pC.url.endswith('/admin/login') and await pC.locator('tbody').count()==0,pC.url)
        # concurrency: several parallel requests right at expiry must not log the user out (reuse interval)
        cD,pD=await login(br,'admin'); await asyncio.sleep(47); rs=await asyncio.gather(*[pD.request.get(B+p_) for p_ in ['/admin/services','/admin/projects','/admin/faqs','/admin/media']])
        chk('4 parallel requests at the moment of expiry all succeed (no refresh-race logout)',all(r.status==200 for r in rs),[r.status for r in rs])
        gw_restart(3600); print(f'\nPART B4: {adm_lib.P} passed, {adm_lib.F} failed'); await br.close()
asyncio.run(main())
