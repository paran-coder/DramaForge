import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Windows one-click CMD extracts the last marker, not the one within command text',()=>{
 const cmd=read('web/downloads/DramaForge-Setup-Windows.cmd');
 const marker='### DRAMAFORGE-POWERSHELL ###';
 assert.ok(cmd.indexOf(marker)>0);
 assert.ok(cmd.lastIndexOf(marker)>cmd.indexOf(marker),'marker appears inside CMD command and before payload');
 assert.match(cmd, /\$raw\.LastIndexOf\(\$marker\)/);
 assert.doesNotMatch(cmd,/\$raw\.IndexOf\(\$marker\)/);
 const script=cmd.substring(cmd.lastIndexOf(marker)+marker.length).trimStart();
 assert.ok(script.startsWith('# DramaForge 1.7.2 per-user bootstrap'));
 assert.match(script,/Invoke-WebRequest/);
 assert.match(script,/Get-FileHash/);
});
test('Windows installer verifies service ready, logs failures and does not rely on mere TCP connect',()=>{
 const ps=read('installer/install-windows.ps1');
 assert.match(ps,/Invoke-RestMethod -Uri 'http:\/\/127\.0\.0\.1:7331\/health'/);
 assert.match(ps,/version -eq '1\.7\.2'/);
 assert.match(ps,/Start-Transcript/);
 assert.match(ps,/bridge\.stderr\.log/);
 assert.match(ps,/설치 실패:/);
});
test('the connect dialog explicitly attempts a bridge connection before login',()=>{
 const script=read('web/main.mjs');
 const start=script.indexOf("$('loginBtn').onclick");
 const block=script.slice(start,start+1000);
 assert.match(block,/if\(!bridge\.token\)await bridge\.connect\(\);/);
 assert.match(block,/const result=await bridge\.login\(\)/);
 assert.match(script,/connectionErrorMessage/);
});
