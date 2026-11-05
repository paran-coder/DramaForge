import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {CodexBridgeProvider,validateDramaJob,collectAgentText} from '../bridge/provider.mjs';
import {BridgeClient} from '../web/bridge-client.mjs';
import {createBridge} from '../bridge/server.mjs';
import {createHash} from 'node:crypto';

test('NodeCanvas image input and DramaForge text jobs stay separate',()=>{
 assert.equal(validateDramaJob({mode:'shots',prompt:'  장면 1  '}).prompt,'장면 1');
 assert.throws(()=>validateDramaJob({mode:'shell',prompt:'pwd'}));
 assert.throws(()=>validateDramaJob({mode:'canon',prompt:'비밀',images:['data:image/png;base64,YQ==']}));
 assert.throws(()=>validateDramaJob({mode:'review',prompt:'x'.repeat(28001)}));
 assert.equal(collectAgentText([{type:'reasoning',text:'secret'},{type:'agentMessage',text:'{"shots":[]}'}]),'{"shots":[]}');
 assert.throws(()=>collectAgentText([{type:'reasoning',text:'not output'}]));
});

test('Codex app-server event stream produces structured shot text without tool invocation',async t=>{
 const home=await mkdtemp(path.join(os.tmpdir(),'dftext-'));t.after(()=>rm(home,{force:true,recursive:true}));
 const p=new CodexBridgeProvider({home});
 p.start=async()=>true;
 const calls=[];
 p.rpc=async (method,params)=>{
  calls.push({method,params});
  if(method==='account/read')return{account:{type:'chatgpt'}};
  if(method==='thread/start')return{thread:{id:'test-thread'}};
  if(method==='turn/start'){
   queueMicrotask(()=>{
    p.emit('notification',{method:'item/completed',params:{threadId:'test-thread',item:{id:'msg-1',type:'agentMessage',text:'{"shots":[{"scene":"SC01","title":"비 오는 밤","guardClaims":[]}]}'}}});
    p.emit('notification',{method:'turn/completed',params:{threadId:'test-thread',turn:{status:'completed',items:[]}}});
   });
   return{turn:{id:'test-turn'}};
  }
  if(method==='thread/unsubscribe')return {};
  throw Error('Unexpected Codex RPC: '+method);
 };
 const result=await p.createJob({mode:'shots',prompt:'승인된 사건을 유지하고 샷 생성'});
 assert.equal(JSON.parse(result.text).shots[0].scene,'SC01');
 const thread=calls.find(x=>x.method==='thread/start').params;
 assert.equal(thread.ephemeral,true);assert.equal(thread.sandbox,'read-only');
 assert.match(thread.baseInstructions,/Never use shell/);
 const turn=calls.find(x=>x.method==='turn/start').params;
 assert.match(turn.input[0].text,/Return JSON only/);
 assert.equal(p.active,null);
});

test('Frontend client authenticates to Native DramaForge bridge, runs text and image jobs', async t=>{
 const ORIGIN='https://dramaforge-lemon-ten.vercel.app';
 const provider={
  status:async()=>({account:{type:'chatgpt',plan:'test'}}),
  login:async()=>({alreadyLoggedIn:true}),
  createJob:async input=>input.mode==='image'?{image:'data:image/png;base64,aGVsbG8='}:{text:'{"shots":[{"scene":"SC01"}]}'},
  shutdown:async()=>{},cancel:async()=>{}
 };
 const s=await createBridge({port:0,provider,origins:[ORIGIN]});t.after(()=>s.close());
 const oldFetch=globalThis.fetch;globalThis.fetch=(u,opts={})=>oldFetch(`http://127.0.0.1:${s.port}${new URL(u).pathname}`,{...opts,headers:{...opts.headers,Origin:ORIGIN}});t.after(()=>globalThis.fetch=oldFetch);
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 const client=new BridgeClient({storage});
 let launched='';
 await client.activate({origin:ORIGIN,openProtocol:url=>{
  launched=url;const challenge=new URL(url).searchParams.get('challenge');
  assert.equal(s.approveActivation({origin:ORIGIN,challenge,createdAt:Date.now()}),true);
 },timeoutMs:8000});
 assert.match(launched,/^dramaforge:\/\/connect/);
 assert.equal((await client.status()).account.plan,'test');
 const shots=await client.job('shots','작품 대본');assert.equal(JSON.parse(shots.text).shots[0].scene,'SC01');
 const image=await client.job('image','하나의 프레임');assert.match(image.image,/^data:image\/png/);
});
