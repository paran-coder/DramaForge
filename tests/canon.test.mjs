import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,safeShots,approveShot,validateImportedProject} from '../web/core.mjs';
import {projectToZip,projectFromZip} from '../web/zip.mjs';
import {attestShotReview} from '../web/guards.mjs';
import {ensureCanon,createCanonCandidate,decideCanonCandidate,reopenDeferredDecision,requestCanonChange,resolveCanonChange,linkShotToCanon,calculateChangeImpact,findSimilarDecisions,requestReconsideration,createWhatIfBranch,addWhatIfIdea,proposeWhatIfToMain,activeCanonContext,buildDirectorPrompt,verifyCanonIntegrity,parseDecisionProposals} from '../web/canon.mjs';

const base=()=>newProject('가족의 비밀');
const add=(p,statement='주인공은 8화까지 아버지 죽음의 진실을 모른다.')=>createCanonCandidate(p,{type:'timeline',title:'주인공의 지식',statement,rationale:'복선을 유지하기 위한 지식 제한'});
const approve=async(p,c)=>decideCanonCandidate(p,c.id,'approved',{actor:'author',expectedVersion:c.version});

test('single-author approval only; AI suggestion stays pending until explicit author click',async()=>{
 const p=base(),candidate=add(p);
 assert.equal(candidate.status,'candidate');
 assert.equal(activeCanonContext(p).includes(candidate.statement),false);
 await assert.rejects(()=>decideCanonCandidate(p,candidate.id,'approved',{actor:'assistant',expectedVersion:1}),/작가만/);
 assert.equal(candidate.status,'candidate');
 await approve(p,candidate);
 assert.equal(candidate.status,'approved');assert.match(candidate.approvalHash,/^[a-f0-9]{64}$/);
 assert.equal(candidate.versions.length,1);
 assert.ok(activeCanonContext(p).includes(candidate.statement));
 await assert.rejects(()=>decideCanonCandidate(p,candidate.id,'approved',{expectedVersion:1}),/검토 중인/);
});

test('rejected duplicate requires changed-premise/evidence review and remains a candidate',async()=>{
 const p=base();const c=add(p,'주인공의 아버지는 몰래 살아 있다.');
 await decideCanonCandidate(p,c.id,'rejected',{expectedVersion:1,reason:'사망 원인이 결말의 핵심이다.',reconsiderWhen:'결말 구조가 변경될 때'});
 assert.throws(()=>add(p,'주인공의 아버지는 몰래 살아 있다!'),/기각된 아이디어/);
 assert.throws(()=>requestReconsideration(p,c.id,{changedPremise:'결말 구조가 변경될 때',evidence:'완결 줄거리 변경'}),/무엇이 달라졌는지/);
 assert.throws(()=>requestReconsideration(p,c.id,{changedPremise:'새로운 사실이 밝혀졌다.',evidence:''}),/근거/);
 const revival=requestReconsideration(p,c.id,{changedPremise:'결말에서 아버지의 사망 장면을 회상으로 수정했다.',evidence:'작가가 작성한 8화 개정 초안이 있다.'});
 assert.equal(revival.status,'candidate');assert.equal(c.status,'rejected');
 assert.equal(p.canon.decisions.length,2);
 await approve(p,revival);
 assert.equal(c.reconsideredBy,revival.id);
 assert.ok(activeCanonContext(p).includes(revival.statement));
 assert.equal(activeCanonContext(p).includes('기각 사유: 사망 원인'),false);
});

test('surface duplicate check blocks exact/spacing duplicates; does not claim semantic recall',async()=>{
 const p=base();const c=add(p);await approve(p,c);
 assert.ok(findSimilarDecisions(p,'주인공은 8화 까지 아버지 죽음의 진실을 모른다.').length>=1);
 assert.throws(()=>add(p,'주인공은 8화 까지 아버지 죽음의 진실을 모른다.'),/승인된 정설/);
 assert.equal(findSimilarDecisions(p,'그는 마지막 순간에 완전히 다른 것을 깨닫게 된다').length,0);
});

test('approved canon is immutable until author change approval; old revision kept',async()=>{
 const p=base();const c=add(p);await approve(p,c);const old=c.statement,hash=c.approvalHash;
 const cr=requestCanonChange(p,c.id,{statement:'주인공은 6화부터 진실을 알고 있다.',reason:'6화 반전 구조로 재설계'});
 assert.equal(c.statement,old);assert.equal(cr.status,'pending');
 await assert.rejects(()=>resolveCanonChange(p,cr.id,{actor:'assistant',approve:true}),/작가만/);
 const approvedChange=await resolveCanonChange(p,cr.id,{approve:true});
 assert.equal(approvedChange.status,'approved');assert.equal(c.version,2);assert.notEqual(c.approvalHash,hash);
 assert.equal(c.versions.length,2);assert.equal(c.versions[0].statement,old);
 const stale=requestCanonChange(p,c.id,{statement:'다시 수정',reason:'연결 테스트를 위한 수정'});stale.baseVersion=1;
 await assert.rejects(()=>resolveCanonChange(p,stale.id,{approve:true}),/버전이 달라/);
});

test('approved dependency changes invalidate explicitly linked shots, unknown scope stays flagged',async()=>{
 const p=base(),c=add(p);await approve(p,c);p.shots=safeShots([{action:'편지 읽기'},{action:'문을 연다'}]);for(const s of p.shots)s.prompt='Cinematic shot';
 const [linked,unlinked]=p.shots;linkShotToCanon(p,linked.id,c.id);attestShotReview(p,linked.id,{reason:'편지를 읽는 장면은 정보 획득 시점과 무관함을 대본에서 확인함'});approveShot(p,linked.id);assert.throws(()=>approveShot(p,unlinked.id),/충돌/);
 const impact=calculateChangeImpact(p,c.id);assert.deepEqual(impact.linkedShotIds,[linked.id]);assert.equal(impact.unlinkedShotCount,1);assert.equal(impact.coverage,'partial');
 const cr=requestCanonChange(p,c.id,{statement:'주인공은 7화에서 진실을 안다.',reason:'사건 정보를 뒤로 미룬다'});
 await resolveCanonChange(p,cr.id,{approve:true});assert.equal(linked.status,'needs_review');assert.equal(unlinked.status,'draft');
 assert.equal(cr.impact.note.includes('별도 검수'),true);
});

test('what-if branch snapshot is isolated, promoting an idea makes candidate only',async()=>{
 const p=base(),c=add(p);await approve(p,c);
 const branch=createWhatIfBranch(p,{name:'살아있는 아버지',premise:'아버지가 사망하지 않았다면'});
 const oldCanon=structuredClone(p.canon.decisions);const oldShotCount=p.shots.length;
 const idea=addWhatIfIdea(p,branch.id,{title:'새로운 만남',statement:'아버지는 3화에 직접 등장한다.'});
 assert.equal(idea.status,'exploring');assert.equal(p.canon.decisions.length,1);
 assert.ok(activeCanonContext(p,{branchId:branch.id}).includes('아버지는 3화'));
 assert.equal(activeCanonContext(p).includes('아버지는 3화'),false);
 const pending=proposeWhatIfToMain(p,branch.id,idea.id);
 assert.equal(pending.status,'candidate');assert.equal(p.canon.decisions.length,2);
 assert.deepEqual(p.canon.decisions[0],oldCanon[0]);assert.equal(p.shots.length,oldShotCount);
 assert.equal(activeCanonContext(p).includes(pending.statement),false);
});

test('director prompts always include approved facts and rejected ideas; rejects silent truncation',async()=>{
 const p=base(),c=add(p);await approve(p,c);p.script='SCENE 1. 서윤은 방에서 편지를 읽는다.';
 const rejected=createCanonCandidate(p,{type:'fact',title:'특별한 결말',statement:'외계인이 등장하여 모든 사건을 해결한다.'});
 await decideCanonCandidate(p,rejected.id,'rejected',{expectedVersion:1,reason:'심리극의 세계관을 벗어남',reconsiderWhen:'작품 장르 자체가 변경될 때'});
 const prompt=buildDirectorPrompt(p);assert.ok(prompt.includes(c.statement));assert.ok(prompt.includes(rejected.statement));assert.ok(prompt.includes(p.script));
 assert.throws(()=>buildDirectorPrompt(p,{maxLength:200}),/초과/);
});

test('AI proposals are parsed as data, not automatically approved',()=>{
 const p=base(),parsed=parseDecisionProposals('```json\n{"decisions":[{"type":"charter","title":"장르","statement":"초자연적 요소 없이 가족 갈등으로만 해결한다."}]}\n```');
 assert.equal(parsed.length,1);assert.equal(p.canon.decisions.length,0);
 assert.throws(()=>parseDecisionProposals('{"decisions":[{"type":"hack","title":"bad","statement":"anything"}]}'),/유형/);
});

test('v1 backup is upgraded without losing script or shot; v2 ZIP restores approvals and branches',async()=>{
 const legacy=base();legacy.schemaVersion=1;delete legacy.canon;legacy.script='과거 드라마';legacy.shots=safeShots([{action:'문을 연다'}]);delete legacy.shots[0].canonRefs;
 const oldZip=projectToZip(legacy);const restored=validateImportedProject(projectFromZip(oldZip));
 ensureCanon(restored);assert.equal(restored.schemaVersion,2);assert.equal(restored.script,'과거 드라마');assert.deepEqual(restored.shots[0].canonRefs,[]);
 const c=add(restored);await approve(restored,c);const b=createWhatIfBranch(restored,{name:'새로운 결말',premise:'범인은 집을 떠난다'});addWhatIfIdea(restored,b.id,{title:'도피',statement:'범인은 열차를 타고 도망친다.'});
 const zipped=projectToZip(restored);const copy=validateImportedProject(projectFromZip(zipped));
 assert.equal(copy.canon.decisions[0].approvalHash,c.approvalHash);assert.equal(copy.canon.branches[0].ideas.length,1);
});

test('deferred idea can be reopened by the author with a version bump',async()=>{
 const p=base(),c=add(p);await decideCanonCandidate(p,c.id,'deferred',{expectedVersion:1,reason:'후반부 구조가 정해지지 않음'});
 assert.equal(c.status,'deferred');assert.throws(()=>reopenDeferredDecision(p,c.id,{actor:'assistant',reason:'완성'}),/작가만/);
 reopenDeferredDecision(p,c.id,{reason:'후반부 구조가 이제 결정됨'});assert.equal(c.status,'candidate');assert.equal(c.version,2);
 await assert.rejects(()=>decideCanonCandidate(p,c.id,'approved',{expectedVersion:1}),/최신 버전/);
 await approve(p,c);assert.equal(c.status,'approved');
});

test('approved canon SHA-256 is verified on backup restore, including archived versions',async()=>{
 const p=base(),c=add(p);await approve(p,c);assert.equal(await verifyCanonIntegrity(p),true);
 const backup=projectToZip(p),restored=validateImportedProject(projectFromZip(backup));assert.equal(await verifyCanonIntegrity(restored),true);
 restored.canon.decisions[0].statement='조작된 정설';
 await assert.rejects(()=>verifyCanonIntegrity(restored),/무결성/);
});
