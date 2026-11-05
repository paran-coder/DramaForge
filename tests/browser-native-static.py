"""Static Chromium inspection of the native-connection dialog; no network or Codex account."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'web/index.html').read_text(encoding='utf-8')
base=(root/'web/styles.css').read_text(encoding='utf-8')
theme=(root/'web/theme.css').read_text(encoding='utf-8')
html=re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S)
html=re.sub(r'<script[^>]*/?>', '', html)
html=html.replace('<link rel="stylesheet" href="/styles.css">',f'<style>{base}</style>')
html=html.replace('<link rel="stylesheet" href="/theme.css">',f'<style>{theme}</style>')
with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,height,label in [(1280,860,'desktop'),(390,844,'mobile')]:
    page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    page.set_content(html)
    page.locator('#connectDialog').evaluate('(el)=>el.showModal()')
    assert page.locator('#autoConnectBtn').inner_text()=='PC 연결 앱 열기'
    assert page.locator('#installConnectorBtn').inner_text()=='Windows 연결 앱 설치'
    assert page.locator('#connectDialog').is_visible()
    page.screenshot(path=str(root/f'docs/native-connect-{label}.png'))
    print('PASS',label, 'dialog',width)
    page.close()
  browser.close()
