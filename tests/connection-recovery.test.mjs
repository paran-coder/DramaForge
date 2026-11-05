import test from 'node:test';import assert from 'node:assert/strict';
import {createBridge} from '../bridge/server.mjs';
import {BridgeClient,makeActivation} from '../web/bridge-client.mjs';
const origin='https://dramaforge-lemon-ten.vercel.app';
const provider={status:async()=>({installed:true,account:null}),login:async()=>({authUrl:'https://auth.openai.com/test'}),shutdown:async()=>{}};
test('installer health check responds without leaking account or bearer token',async t=>{
 const bridge=await createBridge({port:0,origins:[origin],provider});t.after(()=>bridge.close());
 const url=`http://127.0.0.1:${bridge.port}/health`;
 const response=await fetch(url);assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.service,'dramaforge-bridge');assert.equal(body.version,'1.8.1');
 assert.deepEqual(Object.keys(body).sort(),['ok','service','version']);
 const blocked=await fetch(url,{headers:{Origin:'https://evil.example'}});assert.equal(blocked.status,404);
});
test('ChatGPT login requires a native-approved browser session; no passive login',async t=>{
 const calls=[];const old=globalThis.fetch;
 globalThis.fetch=async(url)=>{calls.push(new URL(url).pathname);return{ok:true,status:200,json:async()=>({authUrl:'https://auth.openai.com/test'})}};
 t.after(()=>{globalThis.fetch=old});
 const client=new BridgeClient({storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}});
 await assert.rejects(client.login(),/승인/);assert.equal(calls.length,0);
 client.token='a'.repeat(64);const out=await client.login();assert.equal(out.authUrl,'https://auth.openai.com/test');assert.deepEqual(calls,['/api/login']);
});
test('client presence can fall back to localhost without issuing an auth token',async t=>{
 const old=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url)=>{calls.push(new URL(url).hostname);if(new URL(url).hostname==='127.0.0.1')throw new TypeError('blocked');return{ok:true,status:200,json:async()=>({app:'DramaForge',version:'1.8.1'})}};
 t.after(()=>{globalThis.fetch=old});
 const client=new BridgeClient({storage:{getItem:()=>null}});const out=await client.presence();
 assert.equal(out.app,'DramaForge');assert.deepEqual(calls,['127.0.0.1','localhost']);assert.equal(client.token,null);
});
test('native activation builds expected origin and one-time SHA-256 challenge',async()=>{
 const a=await makeActivation(origin);
 const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(a.secret).digest('hex'),a.challenge);
 assert.match(a.url,/^dramaforge:\/\/connect\?origin=/);assert.match(a.url,/challenge=[0-9a-f]{64}/);
 await assert.rejects(makeActivation('https://evil.example/unsafe'),/유효하지/);
});
