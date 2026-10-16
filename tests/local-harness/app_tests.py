import urllib.request,urllib.error,json,time,re,psycopg2
B='http://localhost:3150'; P=F=0
c=psycopg2.connect(json.load(open('/tmp/h.json'))['uri']);c.autocommit=True;cu=c.cursor()
def sql(q): cu.execute(q)
def get(p):
    try:
        r=urllib.request.urlopen(B+p,timeout=30);return r.status,r.read().decode()
    except urllib.error.HTTPError as e:return e.code,e.read().decode()
def until(f,t=24):
    e=time.time()+t
    while time.time()<e:
        try:
            if f():return True
        except Exception:pass
        time.sleep(2)
    return False
def chk(n,ok,i=''):
    global P,F
    P+=ok;F+=(not ok);print(('PASS ' if ok else 'FAIL ')+n,i if not ok else '')
S=['website-design','web-development','ecommerce-development','ui-ux-design','website-redesign','website-maintenance'];PR=['concept-skincare-store','concept-consulting-site','concept-fitness-club','concept-real-estate']
pages=['','/services','/portfolio','/about','/pricing','/contact','/faq','/privacy-policy','/terms']+[f'/services/{s}' for s in S]+[f'/portfolio/{p}' for p in PR]
bad=[(l,p,get(f'/{l}{p}')[0]) for l in('en','fr','ar') for p in pages if get(f'/{l}{p}')[0]!=200]; chk('all 57 routes (19 pages x EN/FR/AR) return 200 with DB-backed content',not bad,bad)
print('--- content really comes from the database, per language')
_,h=get('/fr/services/web-development'); chk('FR service page: French lead + French FAQ from DB','Nous transformons les maquettes validées' in h and 'Pourrai-je modifier mon contenu' in h)
_,h=get('/ar/services/web-development'); chk('AR service page: Arabic content, dir=rtl','نحوّل التصاميم المعتمدة' in h and '<html lang="ar" dir="rtl">' in h)
_,h=get('/en/portfolio'); chk('EN portfolio lists 4 projects with Concept badge',all(t in h for t in['Skincare Store','Consulting Firm','Fitness Club','Real Estate Listings']) and h.count('Concept project')>=4)
_,h=get('/fr/portfolio'); chk('FR portfolio shows French titles, no English titles leaking','Boutique de soins' in h and 'Skincare Store' not in h)
_,h=get('/ar/portfolio'); chk('AR portfolio shows Arabic titles, no English titles leaking','متجر عناية بالبشرة' in h and 'Consulting Firm' not in h)
_,h=get('/ar'); chk('AR home: Arabic services from DB','تصميم المواقع' in h and 'dir="rtl"' in h)
_,h=get('/fr/services/ui-ux-design'); chk('language switcher keeps the same page','href="/ar/services/ui-ux-design"' in h and 'href="/en/services/ui-ux-design"' in h)
chk('service page has FAQPage structured data from DB','"@type":"FAQPage"' in h)
_,x=get('/sitemap.xml'); chk('sitemap lists 57 URLs incl. all DB services+projects',x.count('<loc>')==57,x.count('<loc>'))
_,h=get('/en/services/web-development'); chk('canonical + hreflang present','rel="canonical"' in h and 'hrefLang="fr"' in h)
_,h=get('/en/contact?service=dev'); chk('contact page renders with the inquiry form','name="website"' in h or 'f-name' in h)
print('--- live database edits, caching (2s window) and visibility rules')
sql("update services set title = title || '{\"fr\":\"TITRE-DB-TEST\"}' where slug='web-development'")
sql("update projects set published=false where slug='concept-fitness-club'")
sql("update services set published=false where slug='website-maintenance'")
sql("update projects set description = description - 'fr' where slug='concept-skincare-store'")
sql("insert into projects(slug,category,category_label,title,description,published) values ('new-cms-project','ecom','{\"en\":\"E-commerce\"}','{\"en\":\"Brand New CMS Project\",\"fr\":\"Nouveau projet CMS\"}','{\"en\":\"Created after the build.\"}',true),('draft-project','ecom','{\"en\":\"E-commerce\"}','{\"en\":\"Secret Draft\"}','{\"en\":\"draft\"}',false)")
sql("insert into testimonials(client_name,client_role,feedback,approved,published,rating) values ('Test Approved','CEO, Test Co','{\"fr\":\"Excellent travail, merci.\"}',true,true,5),('Hidden Unpublished','X','{\"en\":\"SECRET-B\"}',true,false,4),('Pending Unapproved','Y','{\"en\":\"SECRET-C\"}',false,false,3)")

chk('edited FR title appears on the public page after revalidation',until(lambda:'TITRE-DB-TEST' in get('/fr/services/web-development')[1]))
chk('...and on the FR homepage',until(lambda:'TITRE-DB-TEST' in get('/fr')[1]))
chk('unpublished/draft projects hidden from portfolio',until(lambda:'Fitness Club' not in get('/en/portfolio')[1] and 'Secret Draft' not in get('/en/portfolio')[1]))
chk('unpublished project page returns real HTTP 404',until(lambda:get('/en/portfolio/concept-fitness-club')[0]==404))
chk('draft project page returns 404',get('/en/portfolio/draft-project')[0]==404)
chk('unknown project slug returns 404',get('/en/portfolio/zzz-unknown')[0]==404)
chk('unknown service slug returns 404',get('/en/services/zzz-unknown')[0]==404)
chk('project created AFTER the build is served on demand (HTTP 200)',until(lambda:get('/en/portfolio/new-cms-project')[0]==200 and 'Brand New CMS Project' in get('/en/portfolio/new-cms-project')[1]))
chk('...French uses its French title',until(lambda:'Nouveau projet CMS' in get('/fr/portfolio/new-cms-project')[1]))
chk('...and it appears in the portfolio list',until(lambda:'Brand New CMS Project' in get('/en/portfolio')[1]))
chk('unpublished service hidden from services list',until(lambda:'id="website-maintenance"' not in get('/en/services')[1]))
chk('unpublished service page returns 404',until(lambda:get('/en/services/website-maintenance')[0]==404))
chk('sitemap drops unpublished, adds new published',until(lambda:(lambda x:('concept-fitness-club' not in x) and ('website-maintenance' not in x) and ('new-cms-project' in x) and ('draft-project' not in x))(get('/sitemap.xml')[1])))
chk('related projects exclude unpublished',until(lambda:'concept-fitness-club' not in get('/en/portfolio/concept-consulting-site')[1]))
chk('missing FR description falls back to English; French title stays French',until(lambda:(lambda h:'Boutique de soins' in h and 'A concept online store' in h)(get('/fr/portfolio/concept-skincare-store')[1])))
chk('testimonial approved+published visible, in the language it was written in',until(lambda:(lambda h:'Excellent travail, merci.' in h and 'lang="fr"' in h)(get('/fr')[1])))
chk('unpublished / unapproved testimonials NOT visible anywhere',all(('SECRET-B' not in get(p)[1] and 'SECRET-C' not in get(p)[1]) for p in['/en','/fr','/ar']))
chk('empty-state text replaced once a real testimonial exists',until(lambda:'Client feedback will appear here' not in get('/en')[1]))
print('--- restore')
sql("delete from testimonials"); sql("delete from projects where slug in('new-cms-project','draft-project')"); sql("update projects set published=true where slug='concept-fitness-club'"); sql("update services set published=true where slug='website-maintenance'")
sql("update projects set description = description || '{\"fr\":\"Une boutique en ligne conceptuelle avec navigation produit claire et paiement pensé pour le mobile.\"}' where slug='concept-skincare-store'"); sql("update services set title=title||'{\"fr\":\"Développement web\"}' where slug='web-development'")
chk('honest testimonials empty-state returns after deletion',until(lambda:'Client feedback will appear here' in get('/en')[1]))
print(f'\nSUMMARY: {P} passed, {F} failed')
