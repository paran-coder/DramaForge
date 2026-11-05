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
 const ps=read('installer/NodeCanvasPort.cs'),cs=read('installer/NodeCanvasPort.cs');
 assert.match(ps,/nodejs\.org\/dist/);assert.match(ps,/github\.com\/openai\/codex\/releases/);
 assert.match(ps,/SHA256|RuntimeHashes/);assert.match(ps,/LocalApplicationData/);assert.match(ps,/Registry.CurrentUser/);
 assert.match(ps,/IPAddress.Loopback/);assert.match(cs,/LocalApplicationData/);
 assert.match(ps,/Software\\Classes\\dramaforge/);assert.match(cs,/NodeCanvas|dramaforge:\/\/connect/);
 assert.match(ps,/RegisterUninstall/);
});
