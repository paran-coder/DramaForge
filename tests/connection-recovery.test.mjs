import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridge} from '../bridge/server.mjs';
import {BridgeClient} from '../web/bridge-client.mjs';

const origin='https://dramaforge-lemon-ten.vercel.app';
const provider={status:async()=>({installed:true,account:null}),login:async()=>({authUrl:'https://auth.openai.com/test'}),shutdown:async()=>{}};

test('installer health check responds without leaking account or bearer token',async t=>{
  const bridge=await createBridge({port:0,origins:[origin],provider});t.after(()=>bridge.close());
  const url=`http://127.0.0.1:${bridge.port}/health`;
  const response=await fetch(url);assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.service,'dramaforge-bridge');assert.equal(body.version,'1.7.2');
  assert.deepEqual(Object.keys(body).sort(),['ok','service','version']);
  const blocked=await fetch(url,{headers:{Origin:'https://evil.example'}});assert.equal(blocked.status,404);
});

test('ChatGPT login auto-connects to bridge when user has not manually connected',async t=>{
 const old=globalThis.fetch;let calls=[];
 globalThis.fetch=async(url)=>{
  calls.push(new URL(url).pathname);
  if(url.endsWith('/api/connect'))return {ok:true,status:200,json:async()=>({token:'short-session',version:'1.7.2'})};
  if(url.endsWith('/api/login'))return {ok:true,status:200,json:async()=>({authUrl:'https://auth.openai.com/test'})};
  throw Error('unexpected '+url);
 };
 t.after(()=>{globalThis.fetch=old});
 const client=new BridgeClient();assert.equal(client.token,null);
 const out=await client.login();assert.equal(out.authUrl,'https://auth.openai.com/test');
 assert.deepEqual(calls,['/api/connect','/api/login']);assert.equal(client.token,'short-session');
});

test('client uses localhost fallback only when 127.0.0.1 network connection fails',async t=>{
 const old=globalThis.fetch;let calls=[];
 globalThis.fetch=async(url)=>{
  calls.push(new URL(url).hostname);
  if(new URL(url).hostname==='127.0.0.1')throw new TypeError('blocked');
  return {ok:true,status:200,json:async()=>({token:'t',version:'1.7.2'})};
 };
 t.after(()=>{globalThis.fetch=old});
 const client=new BridgeClient();await client.connect();
 assert.deepEqual(calls,['127.0.0.1','localhost']);assert.equal(client.endpoint,'http://localhost:7331');
});
