import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('connection dialog offers a health navigation and platform-scoped repair download',()=>{
 const html=read('web/index.html'),main=read('web/main.mjs');
 for(const id of ['bridgeHealthBtn','bridgeRepairBtn'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(main,/127\.0\.0\.1:7331\/health/);
 assert.match(main,/DramaForge-Repair-Windows\.cmd/);
 assert.match(main,/bridgeRepairBtn'\)\.hidden=true/);
});
test('repair utility is local-only and verifies the installed health endpoint before relaunch',()=>{
 const cmd=read('web/downloads/DramaForge-Repair-Windows.cmd');
 assert.ok(statSync(new URL('../web/downloads/DramaForge-Repair-Windows.cmd',import.meta.url)).size>2000);
 assert.match(cmd,/LastIndexOf\(\$marker\)/);
 assert.match(cmd,/Invoke-RestMethod/);
 assert.match(cmd,/DramaForge-Connection-Check\.txt/);
 assert.match(cmd,/launch\.ps1/);
 assert.doesNotMatch(cmd,/Invoke-WebRequest|Start-BitsTransfer|https:\/\//i);
});
