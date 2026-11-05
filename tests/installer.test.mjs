import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('installation UX offers a native setup action and an OS-protocol activation',()=>{
 const html=read('web/index.html'),main=read('web/main.mjs');
 assert.match(html,/id="installConnectorBtn"/);assert.match(html,/id="installProgress"[^>]*role="status"/);
 assert.match(html,/PC 연결 앱 열기/);assert.doesNotMatch(html,/<ol class="connector-steps">/);
 assert.match(main,/DramaForge-Setup-Windows\.exe/);assert.doesNotMatch(main,/DramaForge-Setup-Windows\.cmd/);
 assert.match(main,/bridge\.activate\(/);assert.match(main,/watchInstallation\(\)/);
});
test('setup bundle uses SHA-256 pinned official runtime source, per-user install and protocol handler',()=>{
 const ps=read('installer/install-windows.ps1'),cs=read('installer/ConnectorLauncher.cs');
 assert.match(ps,/nodejs\.org\/dist/);assert.match(ps,/github\.com\/openai\/codex\/releases/);
 assert.match(ps,/Get-FileHash/);assert.match(ps,/LOCALAPPDATA/);assert.match(ps,/HKCU:/);
 assert.match(ps,/127\.0\.0\.1/);assert.match(cs,/LocalApplicationData/);
 assert.match(ps,/Software\\Classes\\dramaforge/);assert.match(cs,/NodeCanvas|dramaforge:\/\/connect/);
 assert.match(ps,/Remove-ItemProperty.*DramaForgeConnector/);
});
