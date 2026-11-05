import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('native Windows setup embeds launcher and bridge instead of downloading unversioned scripts',()=>{
 const script=read('installer/build-windows.ps1');
 assert.match(script,/ConnectorLauncher\.cs/);assert.match(script,/Setup\.cs/);
 assert.match(script,/launcher-bin/);assert.match(script,/payload\.zip/);assert.match(script,/--self-test/);
 assert.match(read('installer/Setup.cs'),/ExtractSafe/);
});
test('installer checks health, pins downloaded runtimes and can rollback previous installation',()=>{
 const script=read('installer/install-windows.ps1');
 assert.match(script,/127\.0\.0\.1:7331\/health/);assert.match(script,/1\.8\.0/);
 assert.match(script,/Start-Transcript/);assert.match(script,/Stop-Previous-Trusted-Bridge/);
 assert.match(script,/Get-FileHash/);assert.match(script,/Register-Protocol/);
 assert.match(script,/\.v1\.8-backup/);assert.match(script,/if \(-not \$installed\)/);
 assert.doesNotMatch(script,/Start-Process.*-Verb\s+RunAs/i);
});
test('login cannot call bridge until local native activation granted a session',()=>{
 const script=read('web/main.mjs'),block=script.slice(script.indexOf("$('loginBtn').onclick"));
 assert.match(block,/if\(!bridge\.token\)/);
 assert.match(block,/const result=await bridge\.login\(\)/);
 assert.doesNotMatch(block,/await bridge\.connect\(\)/);
});
