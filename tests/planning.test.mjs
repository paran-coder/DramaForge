import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,safeShots,approveShot,validateImportedProject} from '../web/core.mjs';
import {createCanonCandidate,decideCanonCandidate,addShotDependency,calculateChangeImpact,requestCanonChange,resolveCanonChange} from '../web/canon.mjs';
import {recordAuthorMessage,ensurePlanning,planningSignature,buildPlanningPrompt,parsePlanningResult,applyPlanningResult,reviewIsCurrent,reviewIssue} from '../web/planning.mjs';
import {projectFromZip,projectToZip} from '../web/zip.mjs';
import {validateRequest} from '../bridge/server.mjs';
function project(){let p=newProject('반전 가족극');p.script='3화. 서윤은 범인이 누구인지 모른다.';return p;}
const output=(issues=[],candidates=[],reply='기존 정설을 먼저 확인하고 새로운 방향은 후보로만 제안합니다.')=>JSON.stringify({reply,issues,candidates});
const idea=(statement='서윤은 4화에 새로운 편지를 발견한다.')=>({type:'fact',title:'새 편지',statement,rationale:'작가가 명시적으로 제안함',sourceQuote:'3화. 서윤은 범인이 누구인지 모른다.'});
const suspicious=(decisionId='',candidateIndex=null)=>({kind:'duplicate',decisionId,sourceQuote:'서윤은 범인이 누구인지 모른다.',explanation:'기존 결정과 뜻이 같을 수 있습니다.',suggestion:'기존 결정을 다시 확인하고 같은 내용을 재등록하지 않습니다.',confidence:'medium',candidateIndex});
async function approved(p,statement='서윤은 3화까지 범인의 정체를 모른다.'){
 const c=createCanonCandidate(p,{type:'timeline',title:'정보 공개 시점',statement});await decideCanonCandidate(p,c.id,'approved',{expectedVersion:1});return c;
}
test('planning messages are local records; changing approved canon invalidates old review',async()=>{
 const p=project();recordAuthorMessage(p,'서윤은 3화에 비밀을 아직 몰라야 합니다.');const sig=planningSignature(p);
 const review=applyPlanningResult(p,output(),{expectedSignature:sig});assert.equal(reviewIsCurrent(p,review),true);
 assert.equal(p.planning.messages.at(-1).role,'assistant');assert.equal(p.canon.decisions.length,0);
 recordAuthorMessage(p,'다른 가능성도 검토하겠습니다.');assert.equal(reviewIsCurrent(p,review),false);
 await approved(p);assert.equal(reviewIsCurrent(p,review),false);
});
test('review prompt contains approved, rejected, guard and author conversation but not a remote endpoint',async()=>{
 const p=project(),decision=await approved(p);recordAuthorMessage(p,'이번에는 3화에서 반전을 확정하지 않습니다.');
 const prompt=buildPlanningPrompt(p);assert.ok(prompt.includes(decision.statement));assert.ok(prompt.includes('이번에는 3화에서'));assert.ok(prompt.includes(p.script));
 assert.ok(prompt.includes('기획 검토'));assert.throws(()=>buildPlanningPrompt(p,{maxLength:20}),/초과/);
});
test('strict parser rejects malformed review, invented kinds, excessive reports, and invalid candidate index',()=>{
 assert.throws(()=>parsePlanningResult('{broken'),/JSON/);
 assert.throws(()=>parsePlanningResult(JSON.stringify({reply:'ok',issues:[],candidates:new Array(11).fill(idea())})),/스키마/);
 assert.throws(()=>parsePlanningResult(output([{...suspicious(),kind:'hack'}])),/형식/);
 assert.throws(()=>parsePlanningResult(output([{...suspicious(),candidateIndex:4}])),/인덱스/);
 assert.equal(parsePlanningResult('```json\n'+output()+'\n```').issues.length,0);
});
test('AI review reports a semantically duplicated approved decision; linked candidate is not admitted',async()=>{
 const p=project(),d=await approved(p);recordAuthorMessage(p,'서윤은 범인이 누구인지 모른다.');
 const c=idea('3화에서 서윤은 범인의 신원을 알아내지 못한다.');
 const signature=planningSignature(p),review=applyPlanningResult(p,output([suspicious(d.id,0)],[c]),{expectedSignature:signature});
 assert.equal(review.skippedCandidates.length,1);assert.equal(review.importedCandidateIds.length,0);
 assert.equal(p.canon.decisions.length,1);assert.equal(review.issues[0].decisionFound,true);
 assert.equal(review.issues[0].citationFound,true);assert.equal(review.issues[0].status,'needs_author_review');
});
test('unlinked duplicate issue without a quote conservatively blocks candidates',async()=>{
 const p=project(),d=await approved(p),issue={...suspicious(d.id),sourceQuote:'',candidateIndex:null};
 const r=applyPlanningResult(p,output([issue],[idea()]),{expectedSignature:planningSignature(p)});
 assert.equal(r.skippedCandidates.length,1);assert.equal(p.canon.decisions.length,1);
 assert.equal(r.issues[0].verifiedReference,false);
});
test('non-duplicate candidate may enter inbox, never canon without author approval',()=>{
 const p=project();const review=applyPlanningResult(p,output([], [idea()]),{expectedSignature:planningSignature(p)});
 assert.equal(review.importedCandidateIds.length,1);assert.equal(p.canon.decisions[0].status,'candidate');
});
test('stale async result rejected before writing anything',()=>{
 const p=project(),signature=planningSignature(p);recordAuthorMessage(p,'작성 중 새로운 결정을 내렸습니다.');
 assert.throws(()=>applyPlanningResult(p,output(),{expectedSignature:signature}),/변경/);
 assert.equal(p.planning.reviews.length,0);assert.equal(p.planning.messages.length,1);
});
test('only author may resolve review; evidence reason needed and does not change approved canon',async()=>{
 const p=project(),d=await approved(p);recordAuthorMessage(p,'서윤은 범인이 누구인지 모른다.');
 const review=applyPlanningResult(p,output([suspicious(d.id)]),{expectedSignature:planningSignature(p)});
 const i=review.issues[0];assert.throws(()=>reviewIssue(p,review.id,i.id,{actor:'ai',resolution:'dismissed',note:'작가가 확인한 충분한 근거'}),/작가/);
 assert.throws(()=>reviewIssue(p,review.id,i.id,{resolution:'dismissed',note:'짧음'}),/8자/);
 reviewIssue(p,review.id,i.id,{resolution:'acknowledged',note:'대본의 문구를 직접 확인하여 정설을 유지하기로 함'});
 assert.equal(i.status,'acknowledged');assert.equal(p.canon.decisions[0].status,'approved');assert.equal(reviewIsCurrent(p,review),true);
});
test('ZIP restore preserves AI conversation, review, and canon; older formats initialize',async()=>{
 const p=project();recordAuthorMessage(p,'3화 등장인물 지식은 유지합니다.');applyPlanningResult(p,output(),{expectedSignature:planningSignature(p)});
 const copy=validateImportedProject(projectFromZip(projectToZip(p)));ensurePlanning(copy);
 assert.equal(copy.planning.messages.length,2);assert.equal(copy.planning.reviews.length,1);
 const legacy=newProject();delete legacy.planning;ensurePlanning(legacy);assert.equal(legacy.planning.messages.length,0);
});
test('explicit shot dependency graph tracks transitive impact; unknown region stays unknown',async()=>{
 const p=project(),d=await approved(p);p.shots=safeShots([{action:'첫 사건'},{action:'범인을 추적한다'},{action:'후속 사건'},{action:'별도 줄거리'}]);
 const [a,b,c,other]=p.shots;a.canonRefs.push(d.id);
 addShotDependency(p,b.id,a.id);addShotDependency(p,c.id,b.id);
 const impact=calculateChangeImpact(p,d.id);
 assert.deepEqual(impact.linkedShotIds,[a.id]);assert.deepEqual(impact.dependentShotIds,[b.id,c.id]);assert.deepEqual(impact.unknownShotIds,[other.id]);
 assert.throws(()=>addShotDependency(p,a.id,c.id),/순환/);
 for(const shot of p.shots){shot.status='approved';shot.approvedFingerprint='legacy';}
 const change=requestCanonChange(p,d.id,{statement:'서윤은 4화부터 진실을 알게 된다.',reason:'반전 시점을 조정함'});
 await resolveCanonChange(p,change.id,{approve:true});assert.ok(p.shots.every(s=>s.status==='needs_review'));
});
test('bridge validates review and rejects arbitrary execution modes',()=>{
 assert.equal(validateRequest({mode:'review',prompt:'검토 요청'}).mode,'review');
 assert.throws(()=>validateRequest({mode:'shell',prompt:'execute rm'}),/유효한 작업/);
});

test('AI cannot auto-add a candidate without a verifiable quote from the script or author',()=>{
 const p=project();const c={...idea(),sourceQuote:'대본에 없는 완전히 새로운 설정'};
 const result=applyPlanningResult(p,output([], [c]),{expectedSignature:planningSignature(p)});
 assert.equal(result.importedCandidateIds.length,0);assert.equal(result.skippedCandidates.length,1);
 assert.equal(p.canon.decisions.length,0);
});
test('planning prompt answers the latest saved question in context of the previous AI reply',()=>{
 const p=project();
 recordAuthorMessage(p,'조선 시대 트로트 가수 이야기를 기획합니다.');
 applyPlanningResult(p,output([],[],'첫 답변: 궁중 공연을 계기로 갈등을 열어 보세요.'),{expectedSignature:planningSignature(p)});
 recordAuthorMessage(p,'그 방향으로 첫 장면을 제안해 줘.');
 const prompt=buildPlanningPrompt(p);
 assert.match(prompt,/이전 AI 제안[\s\S]*첫 답변: 궁중 공연/);
 assert.match(prompt,/이번 작가 요청[\s\S]*그 방향으로 첫 장면을 제안해 줘/);
});
