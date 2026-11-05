import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createBridge} from '../bridge/server.mjs';
import {newProject} from '../web/core.mjs';
import {createCanonCandidate,decideCanonCandidate} from '../web/canon.mjs';
import {inspectReviewEvidence} from '../web/planning.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ORIGIN='https://dramaforge.example';
function mockProvider(){return{status:async()=>({installed:true,account:{type:'chatgpt',plan:'mock'}}),login:async()=>({alreadyLoggedIn:true}),createJob:async()=>({text:'{"shots":[]}'}),shutdown:async()=>{},cancel:async()=>{}};}
test('static public Vercel config has no server backend and restricts local bridge to loopback',()=>{
 const config=JSON.parse(readFileSync(path.join(root,'vercel.json'),'utf8'));
 assert.equal(config.outputDirectory,'dist');
 assert.equal(config.buildCommand,'npm run build');
 const headers=config.headers.find(x=>x.source==='/(.*)').headers;const map=new Map(headers.map(x=>[x.key,x.value]));
 assert.match(map.get('Content-Security-Policy'),/http:\/\/127\.0\.0\.1:7331/);
 assert.doesNotMatch(map.get('Content-Security-Policy'),/unsafe-eval|unsafe-inline|\*;/);
 assert.match(map.get('Content-Security-Policy'),/frame-ancestors 'none'/);
 assert.equal(map.get('X-Frame-Options'),'DENY');
 assert.equal(map.get('Permissions-Policy'),'camera=(), microphone=(), geolocation=()');
});
test('public web origin is allowlisted; random sites cannot pair or issue shell work',async t=>{
 const b=await createBridge({port:0,origins:[ORIGIN],pairCode:'fedcba9876543210',provider:mockProvider()});
 t.after(()=>b.close());
 const base=`http://127.0.0.1:${b.port}`;
 async function send(route,payload,origin,token=''){
  const res=await fetch(base+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(payload)});
  return {status:res.status,body:await res.json(),headers:res.headers};
 }
 assert.equal((await send('/api/pair',{code:'fedcba9876543210'},'https://attacker.example')).status,403);
 const ok=await send('/api/pair',{code:'fedcba9876543210'},ORIGIN);
 assert.equal(ok.status,200);assert.equal(ok.headers.get('Access-Control-Allow-Origin'),ORIGIN);
 assert.equal(ok.body.version,'1.7.2');
 assert.equal((await send('/api/jobs',{mode:'shots',prompt:'scene'},'https://attacker.example',ok.body.token)).status,403);
 assert.equal((await send('/api/jobs',{mode:'terminal',prompt:'rm -rf /'},ORIGIN,ok.body.token)).status,400);
 assert.equal((await send('/api/status',{},ORIGIN,ok.body.token)).status,200);
});
test('AI source quote must not be marked as author evidence merely because it exists in approved canon',async()=>{
 const p=newProject('인용 증거 구분'),d=createCanonCandidate(p,{type:'fact',title:'비밀',statement:'서윤은 고향의 진실을 알고 있다.'});
 await decideCanonCandidate(p,d.id,'approved',{expectedVersion:1});
 const checked=inspectReviewEvidence(p,{sourceQuote:'서윤은 고향의 진실을 알고 있다.',decisionId:d.id});
 assert.equal(checked.citationFound,false);
 assert.equal(checked.decisionFound,true);
 assert.equal(checked.verifiedReference,false);
});
