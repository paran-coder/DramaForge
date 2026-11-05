import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject} from '../web/core.mjs';
import {createCanonCandidate,decideCanonCandidate} from '../web/canon.mjs';
import {addGuardRule} from '../web/guards.mjs';
import {inspectLocalDraft} from '../web/local-review.mjs';
import {recordAuthorMessage,planningSignature,applyPlanningResult} from '../web/planning.mjs';
import {createEpisode,editEpisode,createSeriesRecord,decideSeriesRecord} from '../web/series.mjs';

async function approved(p,statement,type='character'){
 const d=createCanonCandidate(p,{type,title:'검증할 정설',statement});
 await decideCanonCandidate(p,d.id,'approved',{expectedVersion:d.version});return d;
}
test('approved character state negation is flagged with literal evidence and an author-only suggestion',async()=>{
 const p=newProject('검증 예시'),d=await approved(p,'서윤은 기자다.');
 addGuardRule(p,{decisionId:d.id,kind:'character',subject:'서윤',attribute:'직업',value:'기자',startEpisode:1,endEpisode:8});
 const text='서윤의 직업은 기자가 아니다.\n서윤이 편지를 읽는다.';
 const result=inspectLocalDraft(p,{draftText:text});
 assert.equal(result.issues[0].priority,'high');
 assert.equal(result.issues[0].referenceId,d.id);
 assert.equal(result.issues[0].sourceQuote,'서윤의 직업은 기자가 아니다.');
 assert.match(result.limitation,/자동 수정/);
 assert.equal(p.canon.decisions[0].status,'approved');
});
test('ordinary confirmed sentence does not create a negation warning',async()=>{
 const p=newProject('검증 예시'),d=await approved(p,'서윤은 기자다.');
 addGuardRule(p,{decisionId:d.id,kind:'character',subject:'서윤',attribute:'직업',value:'기자',startEpisode:1,endEpisode:8});
 const r=inspectLocalDraft(p,{draftText:'서윤의 직업은 기자다. 서윤은 취재를 나간다.'});
 assert.equal(r.issues.length,0);
});
test('changed professional description is only a low-confidence suspicion, never a hard block',async()=>{
 const p=newProject('검증 예시'),d=await approved(p,'서윤의 직업은 기자다.');
 addGuardRule(p,{decisionId:d.id,kind:'character',subject:'서윤',attribute:'직업',value:'기자',startEpisode:1,endEpisode:8});
 const r=inspectLocalDraft(p,{draftText:'서윤의 직업은 변호사다.'});
 assert.ok(r.issues.some(x=>x.priority==='low'));
 assert.equal(p.canon.decisions[0].status,'approved');
});
test('rejected idea echoed in composer creates duplicate warning, not a new decision',async()=>{
 const p=newProject('기각 재검토'),d=createCanonCandidate(p,{type:'charter',title:'초자연 해결',statement:'범인이 마법으로 사건을 해결한다.'});
 await decideCanonCandidate(p,d.id,'rejected',{expectedVersion:1,reason:'추리극 현실성을 해침',reconsiderWhen:'장르를 판타지로 변경'});
 const before=p.canon.decisions.length;
 const r=inspectLocalDraft(p,{proposalText:'범인이 마법으로 사건을 해결한다!'});
 assert.ok(r.issues.some(x=>x.kind==='duplicate'&&x.referenceId===d.id));
 assert.equal(p.canon.decisions.length,before);
 assert.equal(p.canon.decisions[0].status,'rejected');
});
test('short unrelated composer text is not flagged as a semantic duplicate',async()=>{
 const p=newProject('기각 재검토'),d=createCanonCandidate(p,{type:'charter',title:'초자연 해결',statement:'범인이 마법으로 사건을 해결한다.'});
 await decideCanonCandidate(p,d.id,'rejected',{expectedVersion:1,reason:'추리극 현실성을 해침',reconsiderWhen:'장르를 판타지로 변경'});
 assert.equal(inspectLocalDraft(p,{proposalText:'서윤이 비를 맞고 걷는다.'}).issues.length,0);
});
test('approved knowledge earlier than learned episode returns a source-linked high-priority warning',()=>{
 const p=newProject('회차 예시');createEpisode(p,{number:1,title:'첫날'});createEpisode(p,{number:3,title:'진실'});
 const r=createSeriesRecord(p,'knowledge',{character:'서윤',fact:'범인의 정체',learnedEpisode:3});
 decideSeriesRecord(p,r.id,'approved',{expectedRevision:1});
 const draft='서윤이 말한다.\n[[KNOW:서윤|범인의 정체]]';
 const result=inspectLocalDraft(p,{draftText:draft,episodeNumber:1});
 assert.ok(result.issues.some(x=>x.kind==='continuity'&&x.priority==='high'&&x.referenceId===r.id));
});
test('AI planning review verifies exact citation inside episode script, not just global script',()=>{
 const p=newProject('인용 근거');createEpisode(p,{number:1,title:'첫날'});
 editEpisode(p,1,{script:'그날 서윤은 빈 편지를 펼쳐 들었다.'});
 recordAuthorMessage(p,'빈 편지 장면을 검토합니다.');
 const body={reply:'1화 문장에 대한 검토입니다.',issues:[{kind:'uncertain',decisionId:'',sourceQuote:'서윤은 빈 편지를 펼쳐 들었다.',explanation:'장면의 목적이 모호할 수 있습니다.',suggestion:'문장에 드러나는 행동을 직접 확인하세요.',confidence:'low',candidateIndex:null}],candidates:[]};
 const review=applyPlanningResult(p,JSON.stringify(body),{expectedSignature:planningSignature(p)});
 assert.equal(review.issues[0].citationFound,true);
 assert.equal(review.issues[0].verifiedReference,true);
});
test('review cannot become silently approved and respects maximum visible count',async()=>{
 const p=newProject('긴 대본'),d=await approved(p,'서윤은 기자다.');
 addGuardRule(p,{decisionId:d.id,kind:'character',subject:'서윤',attribute:'직업',value:'기자',startEpisode:1,endEpisode:8});
 const input=Array.from({length:25},(_,i)=>`서윤의 직업은 기자가 아니다 (${i+1}번째 진술)`).join('\n');
 const snapshot=JSON.stringify(p);
 const result=inspectLocalDraft(p,{draftText:input,limit:5});
 assert.equal(result.issues.length,5);
 assert.ok(result.total>=25);
 assert.equal(JSON.stringify(p),snapshot);
});
