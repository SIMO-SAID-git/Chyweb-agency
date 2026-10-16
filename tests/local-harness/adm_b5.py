import sys,os,subprocess,base64; sys.path.insert(0,'/tmp')
from adm_lib import *
import adm_lib
exec(open('/tmp/adm_b1.py').read().split('async def main')[0].split('import adm_lib, datetime')[1])  # reuse api()/token() helpers
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
open('/tmp/t.png','wb').write(PNG); open('/tmp/t.txt','w').write('not an image'); open('/tmp/big.png','wb').write(b'\0'*(6*1024*1024))
def gw_restart(exp):
    for p in subprocess.run("pgrep -f '[g]ateway.py'",shell=True,capture_output=True,text=True).stdout.split(): os.kill(int(p),15)
    time.sleep(1); env=dict(os.environ,EXPIRES=str(exp)); subprocess.Popen(['python3','/tmp/gateway.py','3005'],env=env,stdout=open('/tmp/gw.log','w'),stderr=subprocess.STDOUT,start_new_session=True); time.sleep(2)
def objs(): return json.loads(urllib.request.urlopen(GW+'/_objects').read())
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(); ctx,page=await login(br,'admin')
        print('=== B5. Media (Storage contract tested against my test double, NOT real Supabase Storage)')
        await page.goto(B+'/admin/media'); chk('empty state before any upload',await page.locator('text=No uploads yet').count()==1)
        await page.set_input_files('#up-file','/tmp/t.txt'); await page.click('button:has-text("Upload")'); await page.wait_for_selector('form [role=alert]'); chk('non-image file refused (client)','Only JPEG' in await page.inner_text('form [role=alert]') and not objs())
        await page.set_input_files('#up-file','/tmp/big.png'); await page.click('button:has-text("Upload")'); await page.wait_for_timeout(600); chk('file over 5 MB refused (client)','5 MB' in await page.inner_text('form [role=alert]') and not objs())
        await page.set_input_files('#up-file','/tmp/t.png'); await page.select_option('#up-folder','projects'); await page.fill('#alt-en','Test pixel'); await page.click('button:has-text("Upload")'); await page.wait_for_selector('[role=status]:has-text("Uploaded. Path:")',timeout=15000)
        row=one("select path from media_assets order by created_at desc limit 1"); chk('image uploaded via signed URL and registered in media_assets (random server-side filename)',bool(re.match(r'^projects/\d{4}/[0-9a-f-]{36}\.png$',row or '')) and len(objs())==1,(row,objs()))
        chk('file is publicly viewable by URL',urllib.request.urlopen(f'{GW}/storage/v1/object/public/media/{row}').headers['Content-Type']=='image/png')
        chk('upload recorded in the activity log',one("select count(*) from activity_log where table_name='media_assets' and action='INSERT'")==1)
        ta,tp=token('admin'),token('plain'); s,b=api('POST',f'/storage/v1/object/upload/sign/media/projects/2026/{uuid.uuid4()}.png',ta,{}); 
        chk('storage: staff may request an upload URL',s==200); url=b['url'] if s==200 else ''
        r=urllib.request.Request(GW+'/storage/v1'+url,data=b'plain text',method='PUT',headers={'Content-Type':'text/plain'})
        try: st=urllib.request.urlopen(r).status
        except urllib.error.HTTPError as e: st=e.code
        chk('storage: non-image content type refused by the bucket rules (415)',st==415,st)
        s,_=api('POST',f'/storage/v1/object/upload/sign/media/projects/2026/{uuid.uuid4()}.png',tp,{}); chk('storage: signed-in user WITHOUT staff profile cannot upload (403)',s==403,s)
        s,_=api('POST',f'/storage/v1/object/upload/sign/media/projects/2026/{uuid.uuid4()}.png',None,{}); chk('storage: anonymous cannot upload',s in(401,403),s)
        q(f"insert into projects(slug,category,category_label,title,description,thumbnail,published,sort_order) values ('zz-media','zz','{{\"en\":\"ZZ\"}}','{{\"en\":\"ZZ Media Project\"}}','{{\"en\":\"d\"}}','{row}',true,903)")
        await page.goto(B+'/admin/media'); await page.click('button:has-text("Delete")'); await page.wait_for_selector('[role=alert]:has-text("Still in use")',timeout=8000); chk('deleting a file that a project still uses is REFUSED (orphan-safe)',len(objs())==1 and one("select count(*) from media_assets")==1)
        h=pub('/en/portfolio/zz-media')[1]; m=re.search(r'/_next/image\?url=([^&"]+)',h); chk('public page renders the Storage image through next/image',bool(m) and 'storage%2Fv1%2Fobject%2Fpublic%2Fmedia' in m.group(1),h[h.find('<img'):h.find('<img')+200] if m is None else '')
        if m:
            u=B+'/_next/image?url='+m.group(1)+'&w=640&q=75'; 
            try: r=urllib.request.urlopen(u); ok=r.status==200 and r.headers['Content-Type'].startswith('image/')
            except urllib.error.HTTPError as e: ok=False; print('   (optimizer said',e.code,e.read()[:120],')')
            chk('...and the image optimizer can fetch it (allowed host configured)',ok)
        q("update projects set thumbnail=null where slug='zz-media'"); await page.goto(B+'/admin/media'); await page.click('button:has-text("Delete")'); await page.wait_for_selector('[role=status]:text-is("File deleted.")',timeout=8000)
        chk('once unused, the file is deleted from Storage and the database',len(objs())==0 and one("select count(*) from media_assets")==0); q("delete from projects where slug='zz-media'")
        print(f'\nPART B5: {adm_lib.P} passed, {adm_lib.F} failed'); print('FAILED:',adm_lib.FAILS); await br.close()
asyncio.run(main())
