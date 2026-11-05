import test from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readdir,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {ActivationGrants,validActivationOrigin} from '../bridge/activation.mjs';
import {createBridge} from '../bridge/server.mjs';
import {BridgeClient} from '../web/bridge-client.mjs';
const ORIGIN='https://dramaforge-lemon-ten.vercel.app';
const SECRET='ab'.repeat(32),CHALLENGE=createHash('sha256').update(SECRET).digest('hex');
const fakeProvider=()=>({status:async()=>({installed:true,account:{type:'chatgpt',plan:'test'}}),login:async()=>({authUrl:'https://auth.openai.com/example'}),shutdown:async()=>{}});
test('grants: invalid origin, expired event, replay and different origin are rejected',()=>{
 let now=1_000_000;const grants=new ActivationGrants({now:()=>now});
 for(const invalid of ['http://attacker.example','https://attacker.example/path','https://attacker.example:443/','http://127.0.0.1:7331'])assert.equal(validActivationOrigin(invalid),false);
 assert.equal(validActivationOrigin(ORIGIN),true);
 assert.equal(grants.approve({origin:ORIGIN,challenge:CHALLENGE,createdAt:now-121_000}),false);
 assert.equal(grants.approve({origin:ORIGIN,challenge:CHALLENGE,createdAt:now}),true);
 assert.equal(grants.claim('https://evil.example',SECRET),false);
 assert.equal(grants.claim(ORIGIN,'cd'.repeat(32)),false);
 assert.equal(grants.claim(ORIGIN,SECRET),true);
 assert.equal(grants.claim(ORIGIN,SECRET),false);
 assert.equal(grants.approve({origin:ORIGIN,challenge:CHALLENGE,createdAt:now}),true);
 now+=120_001;assert.equal(grants.claim(ORIGIN,SECRET),false);
});
test('native activation file is consumed and cannot grant a second web session',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'dramaforge-native-test-'));
 t.after(()=>rm(dir,{force:true,recursive:true}));
 const bridge=await createBridge({port:0,origins:[ORIGIN],activationDir:dir,provider:fakeProvider()});t.after(()=>bridge.close());
 await writeFile(path.join(dir,'5acecace-abcd-1234.json'),JSON.stringify({origin:ORIGIN,challenge:CHALLENGE,createdAt:Date.now()}));
 const url=`http://127.0.0.1:${bridge.port}`;
 const call=async(route,body,origin=ORIGIN)=>{const response=await fetch(url+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return response;};
 assert.equal((await call('/api/claim',{secret:SECRET},'https://evil.example')).status,403);
 const res=await call('/api/claim',{secret:SECRET});assert.equal(res.status,200);
 assert.equal((await call('/api/claim',{secret:SECRET})).status,401);
 assert.deepEqual(await readdir(dir),[]);
});
test('browser native protocol click, file approval and claim support ChatGPT login without a code',async t=>{
 const bridge=await createBridge({port:0,origins:[ORIGIN],provider:fakeProvider()});t.after(()=>bridge.close());
 const realFetch=globalThis.fetch;const called=[];
 globalThis.fetch=(url,init)=>realFetch(`http://127.0.0.1:${bridge.port}`+new URL(url).pathname,{...init,headers:{...init.headers,Origin:ORIGIN}});
 t.after(()=>{globalThis.fetch=realFetch});
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const client=new BridgeClient({storage});
 const result=await client.activate({origin:ORIGIN,openProtocol:url=>{
   called.push(url);const challenge=new URL(url).searchParams.get('challenge');
   assert.equal(bridge.approveActivation({origin:ORIGIN,challenge,createdAt:Date.now()}),true);
 },timeoutMs:5000});
 assert.ok(result.token);assert.equal(client.token,result.token);
 assert.equal(called.length,1);assert.match(called[0],/^dramaforge:\/\/connect/);
 assert.equal((await client.login()).authUrl,'https://auth.openai.com/example');
 assert.equal(new BridgeClient({storage}).token,result.token,'session reuses locally approved bearer');
});
test('native activation does not grant access based on Origin alone or a malicious JSON',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'dramaforge-forged-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const bridge=await createBridge({port:0,origins:[ORIGIN],activationDir:dir,provider:fakeProvider()});t.after(()=>bridge.close());
 await writeFile(path.join(dir,'8acecace-aaaa.json'),JSON.stringify({origin:'https://evil.example',challenge:CHALLENGE,createdAt:Date.now()}));
 const response=await fetch(`http://127.0.0.1:${bridge.port}/api/claim`,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({secret:SECRET})});
 assert.equal(response.status,401);assert.deepEqual(await readdir(dir),[]);
});
