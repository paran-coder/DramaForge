import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newProject} from '../web/core.mjs';
import {startProject,needsOnboarding,addImportedMaterials,importedPlanningContext} from '../web/onboarding.mjs';
import {buildPlanningPrompt,planningSignature} from '../web/planning.mjs';
import {createBridge} from '../bridge/server.mjs';

function provider(){return {status:async()=>({installed:true,account:{type:'chatgpt',plan:'test'}}),login:async()=>({alreadyLoggedIn:true}),createJob:async()=>({text:'{}'}),shutdown:async()=>{}};}
test('new projects can choose interview or free dialogue without changing canon',()=>{
 const p=newProject('시작');p.onboarding={status:'pending'};
 assert.equal(needsOnboarding(p),true);
 const result=startProject(p,'co-create',{conversationStyle:'interview'});
 assert.equal(result.status,'complete');assert.equal(needsOnboarding(p),false);
 assert.match(buildPlanningPrompt(p),/인터뷰형 공동 기획/);
 assert.deepEqual(p.canon.decisions,[]);
 startProject(p,'co-create',{conversationStyle:'free'});
 assert.match(buildPlanningPrompt(p),/자유 대화/);
});
test('existing materials are unapproved references and invalidates older AI review signature',()=>{
 const p=newProject('기존 자료');startProject(p,'import');const before=planningSignature(p);
 addImportedMaterials(p,[{name:'기획서.md',content:'배신당한 배우가 진실을 추적한다.'},{name:'캐릭터.txt',content:'주인공: 서윤'}]);
 assert.equal(p.importedMaterials.length,2);
 assert.ok(p.importedMaterials.every(d=>d.approved===false));
 assert.notEqual(planningSignature(p),before);
 assert.match(importedPlanningContext(p),/승인되지 않은 외부 문서/);
 assert.match(buildPlanningPrompt(p),/배신당한 배우/);
 assert.deepEqual(p.canon.decisions,[]);
});
test('rejects overlong or binary-like extensions and too many imports',()=>{
 const p=newProject();
 assert.throws(()=>addImportedMaterials(p,[{name:'file.exe',content:'bad'}]));
 assert.throws(()=>addImportedMaterials(p,[{name:'file.txt',content:'a'.repeat(160001)}]));
 assert.throws(()=>addImportedMaterials(p,Array.from({length:13},(_,i)=>({name:`${i}.md`,content:'ok'}))));
});
test('help page and main UI link exist; onboarding offers both paths',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const guide=readFileSync(new URL('../web/guide.html',import.meta.url),'utf8');
 for(const id of ['coCreateBtn','importModeBtn','planningFiles','autoConnectBtn','firstInstallHelp'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/href="\/guide\.html"/);assert.match(guide,/id="ai-connection"/);
 assert.doesNotMatch(html,/id="pairCode"/);
});
test('bridge permits no-code connection only for exact approved origin and retains auth on jobs',async t=>{
 const site='https://dramaforge-lemon-ten.vercel.app';
 const bridge=await createBridge({port:0,origins:[site],provider:provider()});t.after(()=>bridge.close());
 const url=`http://127.0.0.1:${bridge.port}`;
 const request=async(route,origin,token)=>{const r=await fetch(url+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:'{}'});return {status:r.status,data:await r.json()};};
 assert.equal((await request('/api/connect','https://untrusted.example')).status,403);
 assert.equal((await request('/api/status',site)).status,401);
 const established=await request('/api/connect',site);assert.equal(established.status,200);
 assert.equal(established.data.authorization,'origin-allowlist');
 const token=established.data.token;
 assert.equal((await request('/api/status',site,token)).status,200);
 assert.equal((await request('/api/status','https://untrusted.example',token)).status,403);
});
test('imported planning files remain non-canonical through ZIP backup restore',async()=>{
 const {projectToZip,projectFromZip}=await import('../web/zip.mjs');
 const p=newProject('자료 백업');startProject(p,'import');addImportedMaterials(p,[{name:'줄거리.md',content:'고향으로 돌아온 주인공은 감춰진 사건을 발견한다.'}]);
 const restored=projectFromZip(projectToZip(p));
 assert.equal(restored.importedMaterials.length,1);
 assert.equal(restored.importedMaterials[0].approved,false);
 assert.deepEqual(restored.canon.decisions,[]);
});
