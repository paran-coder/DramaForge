import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBridge,validateRequest,verifyToken} from '../bridge/server.mjs';
const ORIGIN='http://127.0.0.1:4173';
function fakeProvider(){return{status:async()=>({installed:true,account:{type:'chatgpt',plan:'test'}}),login:async()=>({alreadyLoggedIn:true}),createJob:async input=>input.mode==='image'?{image:'data:image/png;base64,dGVzdA=='}:{text:'{"shots":[{"action":"문을 연다"}]}'},shutdown:async()=>{},cancel:async()=>{}};}
test('job validation enforces type, length and image sizes',()=>{assert.throws(()=>validateRequest({mode:'terminal',prompt:'pwd'}));assert.throws(()=>validateRequest({mode:'shots',prompt:'x'.repeat(28001)}));assert.equal(validateRequest({mode:'shots',prompt:' test '}).prompt,'test');assert.equal(verifyToken('Bearer abc','abc'),true);assert.equal(verifyToken('Bearer abc','ab'),false);});
test('bridge requires native-approved one-use grant; supports queued mock AI job',async t=>{
 const bridge=await createBridge({port:0,origins:[ORIGIN],provider:fakeProvider()});t.after(()=>bridge.close());const endpoint=`http://127.0.0.1:${bridge.port}`;
 async function req(route,body,origin=ORIGIN,token=''){const r=await fetch(endpoint+route,{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return{status:r.status,data:await r.json()};}
 assert.equal((await req('/api/claim',{secret:'a'.repeat(64)},'https://evil.example')).status,403);
 assert.equal((await req('/api/status',{})).status,401);
 assert.equal((await req('/api/connect',{})).status,410);
 assert.equal((await req('/api/pair',{code:'0123456789abcdef'})).status,410);
 const secret='10'.repeat(32),challenge=createHash('sha256').update(Buffer.from(secret,'hex')).digest('hex');
 assert.equal(bridge.approveActivation({origin:ORIGIN,challenge,createdAt:Date.now()}),true);
 let response=await req('/api/claim',{secret});assert.equal(response.status,200);const token=response.data.token;
 assert.equal((await req('/api/claim',{secret})).status,401,'grant is single-use');
 response=await req('/api/status',{},ORIGIN,token);assert.equal(response.data.account.plan,'test');
 response=await req('/api/jobs',{mode:'shots',prompt:'SCENE 1'},ORIGIN,token);assert.equal(response.status,202);
 let result;for(let i=0;i<10;i++){result=await req('/api/job',{id:response.data.id},ORIGIN,token);if(result.data.state==='completed')break;await new Promise(r=>setTimeout(r,15));}
 assert.equal(result.data.state,'completed');assert.match(result.data.result.text,/문을/);
});
test('canon decision extraction is an allowlisted text job; terminal execution stays forbidden',()=>{
 assert.equal(validateRequest({mode:'canon',prompt:'대본의 결정 후보'}).mode,'canon');
 assert.throws(()=>validateRequest({mode:'exec',prompt:'whoami'}),/유효한 작업 유형/);
});
