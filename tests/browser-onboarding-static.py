"""Static DOM and CSS inspection only; no live bridge or IndexedDB assertions."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
styles=(root/'web/styles.css').read_text()+'\n'+(root/'web/theme.css').read_text()
def clean_html(path):
    html=path.read_text()
    html=re.sub(r'<link\s+rel="stylesheet"[^>]*>', '', html)
    html=re.sub(r'<script\b[^>]*>\s*</script>', '', html)
    return html
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.set_content(clean_html(root/'web/index.html'))
    page.add_style_tag(content=styles)
    page.evaluate("document.getElementById('startDialog').showModal()")
    assert page.locator('#coCreateBtn').is_visible()
    assert page.locator('#importModeBtn').is_visible()
    assert page.locator('#planningFiles').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(root/'docs/onboarding-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(root/'docs/onboarding-mobile.png'),full_page=True)
    page.set_content(clean_html(root/'web/guide.html'))
    page.add_style_tag(content=styles)
    assert page.locator('h1').is_visible()
    assert page.locator('a[href="#ai-connection"]').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(root/'docs/guide-mobile.png'),full_page=True)
    browser.close()
print('PASS: static UI elements / desktop and mobile horizontal overflow / guide visibility (no application JS)')
