import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('native Windows setup embeds launcher and bridge instead of downloading unversioned scripts',()=>{
 const script=read('installer/build-windows.ps1');
 assert.match(script,/NodeCanvasPort\.cs/);assert.match(script,/NodeCanvasUninstallPort\.cs/);
 assert.match(script,/trusted-manifest/);assert.match(script,/payload\.zip/);assert.match(script,/--self-test/);
 assert.match(read('installer/NodeCanvasPort.cs'),/ApplyPayload/);
});
test('ported NodeCanvas installer verifies runtimes and atomically restores prior installation',()=>{
 const cs=read('installer/NodeCanvasPort.cs');
 assert.match(cs,/RuntimeHashes/);assert.match(cs,/SHA256/);
 assert.match(cs,/ApplyPayload/);assert.match(cs,/Directory.Move\(target,backup\)/);
 assert.match(cs,/if\(moved\)Directory.Move\(backup,target\)/);
 assert.match(cs,/Registry.CurrentUser.CreateSubKey/);
 assert.doesNotMatch(cs,/Verb\s*=\s*"runas"/i);
});
test('login cannot call bridge until local native activation granted a session',()=>{
 const script=read('web/main.mjs'),block=script.slice(script.indexOf("$('loginBtn').onclick"));
 assert.match(block,/if\(!bridge\.token\)/);
 assert.match(block,/const result=await bridge\.login\(\)/);
 assert.doesNotMatch(block,/await bridge\.connect\(\)/);
});
