import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnector} from '../vendor/nodecanvas-v1.13.0/connector/2026-10-31-server.mjs';
import {BridgeClient} from '../web/nodecanvas-native-client.mjs';
const ORIGIN='https://dramaforge-lemon-ten.vercel.app';

test('unmodified NodeCanvas server receives native approval and handles login/image via DramaForge web adapter',async t=>{
 const generated='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1C9twAAAAASUVORK5CYII=';
 const provider={
  status:async()=>({account:{email:'local@example.com',plan:'plus'}}),
  login:async()=>({authUrl:'https://auth.openai.com/test'}),
  generate:async()=>({images:[generated]}),
  close:async()=>{},shutdown:async()=>{}
 };
 const server=await createConnector({port:0,origins:[],provider,autoExit:false});
 t.after(()=>server.close());
 const realFetch=globalThis.fetch;
 globalThis.fetch=(url,init={})=>{
  const raw=new URL(url),actual=`http://127.0.0.1:${server.port}${raw.pathname}`;
  return realFetch(actual,{...init,headers:{...init.headers,Origin:ORIGIN}});
 };
 t.after(()=>{globalThis.fetch=realFetch});
 const memory=new Map();const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 const client=new BridgeClient({storage});
 let nativeUrl='';
 await client.activate({origin:ORIGIN,openProtocol:url=>{
  nativeUrl=url;
  const parsed=new URL(url);
  assert.equal(server.approveActivation({origin:ORIGIN,challenge:parsed.searchParams.get('challenge'),createdAt:Date.now()}),true);
 },timeoutMs:5000});
 assert.match(nativeUrl,/^nodecanvas:\/\/connect/);
 assert.ok(client.token);
 assert.equal((await client.status()).account.plan,'plus');
 assert.equal((await client.login()).authUrl,'https://auth.openai.com/test');
 const output=await client.job('image','Storyboard test');
 assert.equal(output.image,generated);
 await assert.rejects(()=>client.job('shots','Generate shots'),/이미지 생성만 지원/);
});
