import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BridgeClient,makeActivation} from '../vendor/nodecanvas-compat-client.mjs';

const ORIGIN='https://dramaforge-lemon-ten.vercel.app';
const ORIGINAL_EXE='2ffa9dfa6232d6435c992dd741c27018316c6a01beb553ecde9c530351a74178';
const original=()=>readFileSync(new URL('../vendor/nodecanvas-v1.13.0/web/2026-10-31-NodeCanvas-Setup-v1.13.0.exe',import.meta.url));

test('original NodeCanvas v1.13.0 EXE is byte-for-byte unchanged',()=>{
 const bytes=original();
 assert.equal(bytes.length,175616);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),ORIGINAL_EXE);
 assert.equal(bytes.toString('ascii',0,2),'MZ');
});
test('browser uses original nodecanvas:// activation and NodeCanvas SHA256 challenge',async()=>{
 const a=await makeActivation(ORIGIN);
 assert.equal(a.challenge,createHash('sha256').update(a.secret,'utf8').digest('hex'));
 assert.equal(new URL(a.url).protocol,'nodecanvas:');
 assert.equal(new URL(a.url).hostname,'connect');
 assert.equal(new URL(a.url).searchParams.get('origin'),ORIGIN);
});
test('original NodeCanvas claim/status/login/image endpoints work with adapter', async t=>{
 const realFetch=globalThis.fetch;
 const calls=[];let jobNumber=0;
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 const storage=new Map(),session={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.fetch=async(url,init)=>{
  const route=new URL(url).pathname;const input=JSON.parse(init.body);calls.push({route,input,url});
  if(route==='/api/claim')return reply({token:'original-nc-token',version:'1.13.0'});
  if(route==='/api/status')return reply({account:{email:'test@example.com',plan:'plus'}});
  if(route==='/api/login')return reply({authUrl:'https://auth.openai.com/test'});
  if(route==='/api/jobs'){jobNumber++;assert.equal(input.kind,'generate');assert.equal(input.ratio,'16:9');return reply({id:'nodecanvas-job-1'},202);}
  if(route==='/api/job')return reply({state:'completed',images:['data:image/png;base64,aGVsbG8=']});
  if(route==='/api/heartbeat')return reply({ok:true});
  throw new Error('unexpected route '+route);
 };
 t.after(()=>{globalThis.fetch=realFetch;});
 const bridge=new BridgeClient({storage:session});
 let protocol;
 const result=await bridge.activate({origin:ORIGIN,openProtocol:url=>protocol=url,timeoutMs:2000});
 assert.equal(result.token,'original-nc-token');
 assert.match(protocol,/^nodecanvas:\/\/connect/);
 assert.equal((await bridge.status()).account.plan,'plus');
 assert.equal((await bridge.login()).authUrl,'https://auth.openai.com/test');
 const image=await bridge.job('image','A storyboard frame');
 assert.match(image.image,/^data:image\/png;base64,/);
 assert.equal(jobNumber,1);
 assert.equal(calls.find(c=>c.route==='/api/claim').input.tabId,bridge.tabId);
 assert.equal(new BridgeClient({storage:session}).token,result.token);
});
test('the original image-only server is not misrepresented as a text generator',async()=>{
 const store={getItem:k=>k==='dramaforge-nodecanvas-token-v1'?'abc':null,setItem(){},removeItem(){}};
 const bridge=new BridgeClient({storage:store});
 await assert.rejects(()=>bridge.job('shots','test'),/이미지 생성만 지원/);
});
