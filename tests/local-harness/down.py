import sys,subprocess; sys.path.insert(0,'/tmp')
from adm_lib import *
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(); ctx,page=await login(br,'admin'); await page.goto(B+'/admin/services'); ok=await page.locator('tbody tr').count()==6
        subprocess.run("pkill -f '[/]tmp/postgrest'",shell=True); await asyncio.sleep(2)
        await page.goto(B+'/admin/services'); body=await page.inner_text('body')
        chk('database DOWN: admin page shows a clear error with retry (no crash page, no stack trace)', 'could not be loaded' in body and 'Try again' in body and 'Error:' not in body and 'ECONN' not in body, body[:200].replace('\n',' | '))
        await page.goto(B+'/admin'); b2=await page.inner_text('body'); chk('database DOWN: dashboard also shows the retry page, never fake numbers','could not be loaded' in b2 and 'published of' not in b2,b2[:160].replace('\n',' | '))
        r=urllib.request.Request(B+'/en',method='GET'); chk('database DOWN: already-cached public pages keep working',urllib.request.urlopen(r).status==200)
        print(f'DOWN TEST: {adm_lib.P} passed, {adm_lib.F} failed'); await br.close()
import adm_lib
asyncio.run(main())
