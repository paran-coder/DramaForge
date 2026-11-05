import test from 'node:test';import assert from 'node:assert/strict';import {createBridge,validateRequest,verifyToken} from '../bridge/server.mjs';
const ORIGIN='http://127.0.0.1:4173';
function fakeProvider(){return{status:async()=>({installed:true,account:{type:'chatgpt',plan:'test'}}),login:async()=>({alreadyLoggedIn:true}),createJob:async input=>input.mode==='image'?{image:'data:image/png;base64,dGVzdA=='}:{text:'{"shots":[{"action":"문을 연다"}]}'},shutdown:async()=>{},cancel:async()=>{}};}
test('job validation enforces type, length and image sizes',()=>{assert.throws(()=>validateRequest({mode:'terminal',prompt:'pwd'}));assert.throws(()=>validateRequest({mode:'shots',prompt:'x'.repeat(28001)}));assert.equal(validateRequest({mode:'shots',prompt:' test '}).prompt,'test');assert.equal(verifyToken('Bearer abc','abc'),true);assert.equal(verifyToken('Bearer abc','ab'),false);});
test('bridge requires exact origin and pairing, supports queued mock AI job',async t=>{const bridge=await createBridge({port:0,origins:[ORIGIN],pairCode:'0123456789abcdef',provider:fakeProvider()});t.after(()=>bridge.close());const endpoint=`http://127.0.0.1:${bridge.port}`;
async function req(route,body,origin=ORIGIN,token=''){const r=await fetch(endpoint+route,{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
let a=await req('/api/pair',{code:'0123456789abcdef'},'https://evil.example');assert.equal(a.status,403);
a=await req('/api/status',{});assert.equal(a.status,401);
a=await req('/api/pair',{code:'wrong'});assert.equal(a.status,401);
a=await req('/api/pair',{code:'0123456789abcdef'});assert.equal(a.status,200);const token=a.data.token;
a=await req('/api/status',{},ORIGIN,token);assert.equal(a.data.account.plan,'test');
a=await req('/api/jobs',{mode:'shots',prompt:'SCENE 1'},ORIGIN,token);assert.equal(a.status,202);
let result;for(let i=0;i<10;i++){result=await req('/api/job',{id:a.data.id},ORIGIN,token);if(result.data.state==='completed')break;await new Promise(r=>setTimeout(r,15));}assert.equal(result.data.state,'completed');assert.match(result.data.result.text,/문을/);
});
test('canon decision extraction is an allowlisted text job; terminal execution stays forbidden',()=>{
 assert.equal(validateRequest({mode:'canon',prompt:'대본의 결정 후보'}).mode,'canon');
 assert.throws(()=>validateRequest({mode:'exec',prompt:'whoami'}),/유효한 작업 유형/);
});
