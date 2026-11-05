import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeActivation} from '../web/bridge-client.mjs';
import {ActivationGrants} from '../bridge/activation.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ORIGIN='https://dramaforge-lemon-ten.vercel.app';
test('ported NodeCanvas launcher retains native URL protocol and desktop origin approval',()=>{
 const source=read('installer/NodeCanvasPort.cs');
 for(const part of ['dramaforge://connect','trusted-origins.txt','Registry.CurrentUser.CreateSubKey','activations','Mutex','NotifyIcon','RuntimeHashes','ApplyPayload','GetManifestResourceStream("payload.zip")'])assert.ok(source.includes(part),part);
 assert.match(source,/7331/);assert.match(source,/if\(InstalledApp.PortInUse\(\)\)/);assert.doesNotMatch(source,/nodecanvas:\/\/connect/i);
});
test('browser and local grant use same NodeCanvas SHA256(UTF8(secret)) pairing contract',async()=>{
 const act=await makeActivation(ORIGIN);
 assert.equal(act.challenge,createHash('sha256').update(act.secret,'utf8').digest('hex'));
 const grants=new ActivationGrants();assert.ok(grants.approve({origin:ORIGIN,challenge:act.challenge,createdAt:Date.now()}));
 assert.equal(grants.claim(ORIGIN,act.secret),true);
 assert.equal(grants.claim(ORIGIN,act.secret),false);
});
test('Windows workflow checks and publishes a real compiled artifact, not an empty download placeholder',()=>{
 const workflow=read('.github/workflows/windows-installer.yml');
 assert.match(workflow,/windows-latest/);
 assert.match(workflow,/build-windows\.ps1/);
 assert.match(workflow,/upload-artifact/);
 assert.match(workflow,/0x4D/);
});
