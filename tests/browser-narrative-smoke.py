"""Optional Chromium DOM smoke test. Runs Narrative Memory's actual JS/CSS with an
isolated in-memory project, no network, no Codex, and no IndexedDB assumptions.
Usage: python tests/browser-narrative-smoke.py
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
html = (root / 'web/index.html').read_text()
html = re.sub(r'<link\s+rel="stylesheet"[^>]*>', '', html)
html = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', html)
model = (root / 'web/narrative.mjs').read_text().replace('export function ', 'function ')
ui = re.sub(r'^import .*?;\s*', '', (root / 'web/narrative-ui.mjs').read_text(), count=1, flags=re.M).replace('export function ', 'function ')
fixture = '''
window.__messages=[];window.__testUUID=0;Object.defineProperty(window.crypto,'randomUUID',{value:()=>`test-${++window.__testUUID}`});
window.__p={revision:0,shots:[],history:[],series:{episodes:[{number:1,title:'서막',script:'',revision:1},{number:2,title:'반전',script:'',revision:1},{number:5,title:'진실 공개',script:'',revision:1}], records:[{id:'eventA',type:'event',status:'approved',revision:1,title:'편지 발견',episode:1,order:1},{id:'eventB',type:'event',status:'approved',revision:1,title:'친구의 배신',episode:2,order:1}]},narrative:{schemaVersion:1,records:[],changes:[],audit:[],reviews:[]}};
window.__ui=initNarrativeUI({getProject:()=>window.__p,getEpisode:()=>1,persist:async()=>{},afterChange:()=>window.__ui.render(),notice:(m)=>window.__messages.push(m)});
window.__ui.render();
'''
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page_errors = []
    page.on('pageerror', lambda e: page_errors.append(str(e)))
    page.set_content(html)
    page.add_style_tag(content=(root / 'web/styles.css').read_text())
    page.add_style_tag(content=(root / 'web/theme.css').read_text())
    page.add_script_tag(content=model+'\n'+ui+'\n'+fixture)
    page.evaluate("document.getElementById('writerWorkspace').classList.add('hidden');document.getElementById('episodeWorkspace').classList.remove('hidden');")
    page.locator('#narrativeType').select_option('perspective')
    page.locator('#worldTruth').fill('아버지는 이미 사망했다')
    page.locator('#perspectiveCharacter').fill('서윤')
    page.locator('#characterBelief').fill('아버지는 살아 있다')
    page.locator('#characterBeliefEpisode').fill('1')
    page.locator('#audienceBelief').fill('아버지는 해외에 있다')
    page.locator('#audienceMisleadEpisode').fill('2')
    page.locator('#truthRevealEpisode').fill('5')
    page.locator('#intentionalMisdirection').check()
    page.locator('#directorIntent').fill('5화 후반 공개 반전으로 인물의 선택을 설명한다')
    page.locator('#addNarrativeBtn').click()
    assert len(page.evaluate('window.__p.narrative.records')) == 1
    assert page.evaluate('window.__p.narrative.records[0].status') == 'candidate'
    page.locator('#narrativeRecordList').get_by_role('button', name='작가 승인').click()
    assert page.evaluate('window.__p.narrative.records[0].status') == 'approved'
    assert '아버지는 이미 사망했다' in page.locator('#narrativeStateList').inner_text()
    page.locator('#narrativeType').select_option('timeline')
    page.locator('#timelineEvent').select_option('eventA')
    page.locator('#worldOrder').fill('1')
    page.locator('#worldTime').fill('극중 5년 전')
    page.locator('#audienceEventEpisode').fill('1')
    page.locator('#audienceEventScene').fill('SC01')
    page.locator('#addNarrativeBtn').click()
    page.locator('#narrativeRecordList').get_by_role('button', name='작가 승인').first.click()
    assert '극중 5년 전' in page.locator('#narrativeTimeList').inner_text()
    assert 'SC01' in page.locator('#narrativeTimeList').inner_text()
    desktop = root / 'docs/narrative-ui-desktop-smoke.png'
    desktop.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(desktop), full_page=True)
    desktop_layout=page.evaluate('''() => ({width:document.documentElement.scrollWidth, viewport:innerWidth, panel: getComputedStyle(document.querySelector('.narrative-grid')).gridTemplateColumns, font:getComputedStyle(document.getElementById('narrativeHeading')).fontSize, cta:getComputedStyle(document.getElementById('addNarrativeBtn')).backgroundColor})''')
    assert desktop_layout['width'] <= desktop_layout['viewport']
    assert desktop_layout['font'] == '18px', desktop_layout
    assert desktop_layout['cta'] == 'rgb(252, 213, 53)', desktop_layout
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(60)
    mobile_layout=page.evaluate('''() => ({width:document.documentElement.scrollWidth, viewport:innerWidth, columns:getComputedStyle(document.querySelector('.narrative-grid')).gridTemplateColumns})''')
    assert mobile_layout['width'] <= mobile_layout['viewport'], mobile_layout
    page.screenshot(path=str(root/'docs/narrative-ui-mobile-smoke.png'), full_page=True)
    assert not page_errors, page_errors
    print('PASS: DOM interaction / author approval / viewer state / timeline / CSS hierarchy / mobile overflow')
    print('Desktop', desktop_layout)
    print('Mobile', mobile_layout)
    print('Screenshots',desktop,root/'docs/narrative-ui-mobile-smoke.png')
    browser.close()
