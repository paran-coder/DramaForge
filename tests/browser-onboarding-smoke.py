"""Browser integration for deployed static files without network calls or credentials."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
web = root / 'dist'
errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    def local(route):
        url=route.request.url
        if not url.startswith('https://dramaforge-lemon-ten.vercel.app/'):
            route.abort();return
        rel=url.split('https://dramaforge-lemon-ten.vercel.app/',1)[1].split('?',1)[0].lstrip('/')
        path=web / (rel or 'index.html')
        if not path.is_file():route.fulfill(status=404,body='');return
        typ={'html':'text/html; charset=utf-8','css':'text/css','js':'text/javascript','mjs':'text/javascript','zip':'application/zip','png':'image/png'}.get(path.suffix.lstrip('.'),'application/octet-stream')
        route.fulfill(status=200,content_type=typ,body=path.read_bytes())
    context.route('**/*',local)
    page.goto('https://dramaforge-lemon-ten.vercel.app/',wait_until='domcontentloaded')
    page.locator('#startDialog').wait_for(state='visible',timeout=15000)
    assert '작품을 어떻게' in page.locator('#startDialog').inner_text()
    page.locator('#coCreateBtn').click()
    assert not page.locator('#startDialog').is_visible()
    assert '아이디어:' in page.locator('#planningInput').input_value()
    page.locator('#planningInput').fill('장르: 심리 스릴러. 주인공은 가족의 비밀을 추적한다.')
    page.locator('#recordPlanningBtn').click()
    page.wait_for_timeout(220)
    assert '심리 스릴러' in page.locator('#planningMessages').inner_text()
    page.locator('#newProjectBtn').click()
    page.locator('#startDialog').wait_for(state='visible')
    page.locator('#importModeBtn').click()
    page.locator('#planningFiles').set_input_files([
        {'name':'기획서.md','mimeType':'text/markdown','buffer':'전체 작품의 중심 갈등은 선택과 책임이다.'.encode()},
        {'name':'캐릭터.txt','mimeType':'text/plain','buffer':'주인공은 서윤, 기자.'.encode()},
    ])
    page.wait_for_timeout(350)
    assert '참고 자료 2개' in page.locator('#importSummary').inner_text()
    assert not page.locator('#startDialog').is_visible()
    page.reload(wait_until='domcontentloaded')
    page.wait_for_timeout(350)
    assert '참고 자료 2개' in page.locator('#importSummary').inner_text()
    assert not page.locator('#startDialog').is_visible()
    page.screenshot(path=str(root/'docs/onboarding-desktop.png'),full_page=True)
    page.goto('https://dramaforge-lemon-ten.vercel.app/guide.html',wait_until='domcontentloaded')
    assert 'ChatGPT Codex 연결' in page.locator('main').inner_text()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(100)
    width=page.evaluate('document.documentElement.scrollWidth');assert width<=390,(width,390)
    page.screenshot(path=str(root/'docs/guide-mobile.png'),full_page=True)
    assert not errors,errors
    print('PASS onboarding, 2 files import, real IndexedDB persistence, guide, mobile width, no JS errors')
    browser.close()
