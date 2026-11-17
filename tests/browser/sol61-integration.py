import argparse, csv, io, json, pathlib, hashlib
from playwright.sync_api import sync_playwright, expect
parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:3114')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[2]
products = json.loads((root/'src/data/mrd.json').read_text())
out = root/'docs/research/sol61-integration'
out.mkdir(parents=True, exist_ok=True)
result = {'base_url':args.base_url, 'details':[], 'exports':{}, 'runtime_errors':[]}
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':980}, accept_downloads=True)
    page = context.new_page()
    page.on('pageerror', lambda e: result['runtime_errors'].append(str(e)))
    try:
        page.goto(args.base_url+'/mrd', wait_until='networkidle')
        expect(page.get_by_role('heading', name='MRD 性能矩阵', exact=True)).to_be_visible()
        for name in ['技术','分析','临床','价格','产品']:
            page.get_by_role('button',name=name,exact=True).click()
            expect(page.get_by_role('button',name=name,exact=True)).to_have_attribute('aria-pressed','true')
        page.get_by_role('button', name='WGS', exact=True).click()
        page.get_by_label('随访检测', exact=True).select_option('WGS')
        page.reload(wait_until='networkidle')
        expect(page.get_by_label('随访检测',exact=True)).to_have_value('WGS')
        expected=[x for x in products if x['tissue']=='WGS' and x['tracking']=='WGS']
        links=page.locator('h3 a[href^="/mrd/"]').evaluate_all('nodes=>nodes.map(n=>n.getAttribute("href").split("/").pop())')
        assert set(links)==set(x['id'] for x in expected), links
        with page.expect_download() as download: page.get_by_role('link',name='导出 CSV',exact=True).click()
        rows=list(csv.reader(io.StringIO(pathlib.Path(download.value.path()).read_text(encoding='utf-8-sig'))))
        assert len(rows)==len(expected)+1
        result['filtered_csv']=len(rows)-1
        filtered=context.request.get(args.base_url+'/api/v1/mrd?tissue=WGS&tracking=WGS').json()
        assert set(x['id'] for x in filtered['products'])==set(x['id'] for x in expected)
        page.goto(args.base_url+'/mrd?approach=hybrid&view=analytical',wait_until='networkidle')
        assert page.locator('tbody tr').count()==len([x for x in products if x['approach']=='hybrid'])
        for product in products:
            response=page.goto(args.base_url+'/mrd/'+product['id'],wait_until='networkidle')
            assert response.status==200, product['id']
            expect(page.get_by_role('heading',name=product['product'],exact=True)).to_be_visible()
            assert '/Users/' not in page.locator('main').inner_text()
            data=context.request.get(args.base_url+'/api/v1/mrd/'+product['id']).json()
            assert data['id']==product['id'] and len(data['analytical'])==len(product.get('analytical',[]))
            result['details'].append(product['id'])
        assert context.request.get(args.base_url+'/api/v1/mrd/missing').status==404
        for dataset in ['mrd','products','studies','performance','regulatory']:
            response=context.request.get(args.base_url+'/api/v1/export/'+dataset)
            assert response.status==200 and response.headers['content-type'].startswith('text/csv')
            rows=list(csv.reader(io.StringIO(response.text().lstrip('\ufeff'))))
            assert len(rows)>1 and all(len(r)==len(rows[0]) for r in rows)
            result['exports'][dataset]=len(rows)-1
        assert result['exports']['mrd']==len(products)
        assert context.request.get(args.base_url+'/api/v1/export/missing').status==404
        status=context.request.get(args.base_url+'/api/v1/status').json()
        assert status['sources'] and all('url' not in s and 'last_error' not in s for s in status['sources'])
        result['status_sources']=len(status['sources'])
        mcp=context.request.post(args.base_url+'/api/mcp',data={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'get_mrd_products','arguments':{'tracking':'WGS','tissue':'WGS'}}}).json()
        content=json.loads(mcp['result']['content'][0]['text'])
        assert set(x['id'] for x in content['products'])==set(x['id'] for x in expected)
        assert content['institution_prices'][0]['amount']==1680
        result['mcp_filters']=True
        for route in ['/','/leaderboard','/performance','/regulatory','/sources','/agent?tab=rest','/mrd?view=analytical']:
            page.goto(args.base_url+route,wait_until='networkidle')
            assert page.locator('h1').inner_text()
        page.screenshot(path=str(out/'mrd-desktop.png'))
        for theme in ['light','dark']:
            page.emulate_media(color_scheme=theme)
            page.set_viewport_size({'width':390,'height':844})
            for route in ['/mrd','/mrd?view=analytical','/mrd/signatera-cdx','/sources','/leaderboard']:
                page.goto(args.base_url+route,wait_until='networkidle')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),route
            page.screenshot(path=str(out/f'leaderboard-{theme}-mobile.png'))
        result['mobile_no_overflow']=True
        assert not result['runtime_errors'], result['runtime_errors']
    finally:
        (out/'acceptance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        browser.close()
print(json.dumps({**result,'details':len(result['details'])},ensure_ascii=False))
