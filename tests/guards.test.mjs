import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,safeShots,editShot} from '../web/core.mjs';
import {createCanonCandidate,decideCanonCandidate,requestCanonChange,resolveCanonChange,createWhatIfBranch,addWhatIfIdea,proposeWhatIfToMain} from '../web/canon.mjs';
import {ensureGuards,addGuardRule,addShotClaim,removeShotClaim,normalizeAIGuardClaims,activeRules,staleRules,inspectShot,attestShotReview,assertShotGuardReady,inspectProposal} from '../web/guards.mjs';
import {projectToZip,projectFromZip} from '../web/zip.mjs';
import {validateImportedProject} from '../web/core.mjs';

function setup(){const p=newProject('가족 드라마');p.shots=safeShots([{action:'서윤은 편지를 읽는다',scene:'SC03',prompt:'8s film'},{action:'서윤은 복도로 나간다',prompt:'8s film'}]);ensureGuards(p);return p;}
async function canon(p,statement='서윤의 직업은 기자이다.',type='character'){
 const d=createCanonCandidate(p,{type,title:'서윤 상태',statement});
 await decideCanonCandidate(p,d.id,'approved',{expectedVersion:d.version});return d;
}
function attach(p,shot,decision){shot.canonRefs.push(decision.id);}
const rule=(decision,overrides={})=>({decisionId:decision.id,kind:'character',subject:'CHAR01',attribute:'직업',value:'기자',startEpisode:1,endEpisode:9,...overrides});
const claim=(overrides={})=>({kind:'character',subject:'CHAR01',attribute:'직업',value:'기자',episode:3,...overrides});

test('guard rules require approved canon and author only',async()=>{
 const p=setup(),d=await canon(p);
 assert.throws(()=>addGuardRule(p,rule(d),{actor:'assistant'}),/작가/);
 assert.throws(()=>addGuardRule(p,{...rule(d),decisionId:'unknown'}),/승인된 정설/);
 const r=addGuardRule(p,rule(d));assert.equal(r.decisionVersion,1);assert.equal(activeRules(p).length,1);
 assert.throws(()=>addGuardRule(p,rule(d)),/동일한/);
});

test('character guard flags an explicit contradictory state, author review cannot override',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));attach(p,p.shots[0],d);
 addShotClaim(p,p.shots[0].id,claim({value:'경찰'}));
 const report=inspectShot(p,p.shots[0].id);
 assert.equal(report.status,'blocked');assert.ok(report.conflicts.some(x=>x.code==='CONTRADICTION'));
 assert.throws(()=>attestShotReview(p,p.shots[0].id,{reason:'장면을 검토하고도 강제로 통과하려 합니다'}),/수동 확인만으로/);
 assert.throws(()=>assertShotGuardReady(p,p.shots[0].id),/충돌/);
});

test('matching manual evidence permits approval; unlinked canon always blocks',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));
 assert.equal(inspectShot(p,p.shots[0].id).status,'blocked');
 assert.throws(()=>attestShotReview(p,p.shots[0].id,{reason:'원문을 검토하여 설정 위반이 없음을 확인함'}),/수동 확인만으로/);
 attach(p,p.shots[0],d);addShotClaim(p,p.shots[0].id,claim());
 const report=assertShotGuardReady(p,p.shots[0].id);
 assert.equal(report.status,'verified');assert.equal(report.matches.length,1);
});

test('missing evidence requires explicit author review with reason and latest signature',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));attach(p,p.shots[0],d);
 assert.equal(inspectShot(p,p.shots[0].id).status,'unverified');
 assert.throws(()=>attestShotReview(p,p.shots[0].id,{actor:'assistant',reason:'충분히 검토한 근거가 있습니다.'}),/작가/);
 assert.throws(()=>attestShotReview(p,p.shots[0].id,{reason:'확인'}),/12자/);
 const report=attestShotReview(p,p.shots[0].id,{reason:'대본 SC03 원문과 앞 장면을 대조하여 결정했습니다.'});
 assert.equal(report.status,'reviewed');assert.equal(assertShotGuardReady(p,p.shots[0].id).eligible,true);
 editShot(p,p.shots[0].id,{action:'서윤은 경찰복을 입고 문을 연다'});
 assert.equal(inspectShot(p,p.shots[0].id).status,'unverified');
});

test('AI claims are provisional even when value agrees with a rule',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));attach(p,p.shots[0],d);
 const shots=safeShots([{action:'서윤이 기록한다',guardClaims:[claim()]}]);
 p.shots[0].guardClaims=shots[0].guardClaims;
 assert.equal(inspectShot(p,p.shots[0].id).status,'unverified');
 assert.ok(inspectShot(p,p.shots[0].id).unverified.some(x=>x.code==='AI_CLAIM_UNVERIFIED'));
 assert.equal(attestShotReview(p,p.shots[0].id,{reason:'3화 대본을 직접 열어 해당 직업 설정을 확인했습니다.'}).status,'reviewed');
});

test('timeline mismatched episode blocks even if event is outside active episode interval',async()=>{
 const p=setup(),d=await canon(p,'아버지 사망 소식은 8화에서 공개된다.','timeline');
 addGuardRule(p,rule(d,{kind:'timeline',subject:'EVENT07',attribute:'공개',value:'공개됨',startEpisode:8,endEpisode:8}));
 attach(p,p.shots[0],d);addShotClaim(p,p.shots[0].id,{kind:'timeline',subject:'EVENT07',attribute:'공개',value:'공개됨',episode:3});
 assert.ok(inspectShot(p,p.shots[0].id).conflicts.some(x=>x.code==='TIMELINE_MISMATCH'));
});

test('knowledge guard distinguishes known from unknown within selected episode',async()=>{
 const p=setup(),d=await canon(p,'서윤은 7화 전에는 범인의 정체를 모른다.','timeline');
 addGuardRule(p,rule(d,{kind:'knowledge',subject:'CHAR01',attribute:'범인정체',value:'모름',startEpisode:1,endEpisode:6}));
 attach(p,p.shots[0],d);addShotClaim(p,p.shots[0].id,{kind:'knowledge',subject:'CHAR01',attribute:'범인정체',value:'알고 있음',episode:3});
 assert.equal(inspectShot(p,p.shots[0].id).status,'blocked');
});

test('contradictory overlapping rules are rejected, disjoint character intervals allowed',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d,{endEpisode:4}));
 assert.throws(()=>addGuardRule(p,rule(d,{value:'경찰',startEpisode:3,endEpisode:6})),/충돌/);
 assert.doesNotThrow(()=>addGuardRule(p,rule(d,{value:'경찰',startEpisode:5,endEpisode:9})));
});

test('event rule cannot silently move to another episode',async()=>{
 const p=setup(),d=await canon(p,'아버지 유언이 8화에 공개된다.','timeline');
 addGuardRule(p,rule(d,{kind:'timeline',subject:'EV7',attribute:'유언 공개',value:'있음',startEpisode:8,endEpisode:8}));
 assert.throws(()=>addGuardRule(p,rule(d,{kind:'timeline',subject:'EV7',attribute:'유언 공개',value:'없음',startEpisode:3,endEpisode:3})),/충돌/);
});

test('canon revision makes old fact rules stale and does not silently trust old review',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));attach(p,p.shots[0],d);
 addShotClaim(p,p.shots[0].id,claim());assert.equal(inspectShot(p,p.shots[0].id).status,'verified');
 const cr=requestCanonChange(p,d.id,{statement:'서윤의 직업은 경찰이다.',reason:'직업 설정 변경으로 극 전개가 바뀜'});
 await resolveCanonChange(p,cr.id,{approve:true});
 assert.equal(activeRules(p).length,0);assert.equal(staleRules(p).length,1);
 assert.equal(inspectShot(p,p.shots[0].id).status,'unverified');
});

test('registering new rule invalidates earlier approvals and manual review',async()=>{
 const p=setup(),d=await canon(p);attach(p,p.shots[0],d);
 attestShotReview(p,p.shots[0].id,{reason:'대본과 앞뒤 대사를 비교해 설정을 확인하였습니다.'});
 p.shots[0].status='approved';p.shots[0].approvedFingerprint='approved-fingerprint';
 addGuardRule(p,rule(d));assert.equal(p.shots[0].status,'needs_review');
 assert.equal(inspectShot(p,p.shots[0].id).humanReviewValid,false);
});

test('removing contradictory claim returns to unverified, never auto-approves',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));attach(p,p.shots[0],d);
 const bad=addShotClaim(p,p.shots[0].id,claim({value:'경찰'}));assert.equal(inspectShot(p,p.shots[0].id).status,'blocked');
 removeShotClaim(p,p.shots[0].id,bad.id);assert.equal(inspectShot(p,p.shots[0].id).status,'unverified');
});

test('decision guard shows rejected decisions without admitting duplicate as new canon',async()=>{
 const p=setup();const d=createCanonCandidate(p,{type:'fact',title:'기각 결말',statement:'외계인이 등장하여 가족의 비밀을 해결한다.'});
 await decideCanonCandidate(p,d.id,'rejected',{expectedVersion:d.version,reason:'기획 의도 위배',reconsiderWhen:'세계관이 변경될 때'});
 const report=inspectProposal(p,'외계인이 등장하여 가족의 비밀을 해결한다.');
 assert.equal(report.exactOrSimilar[0].status,'rejected');assert.equal(report.exactOrSimilar[0].requiresChangedPremise,true);
});

test('what-if proposals do not create approved rules or change active canon',async()=>{
 const p=setup(),d=await canon(p);const branch=createWhatIfBranch(p,{name:'다른 직업',premise:'서윤이 경찰이었다면'});
 const idea=addWhatIfIdea(p,branch.id,{title:'새 직업',statement:'서윤은 경찰이다.'});
 const before=structuredClone(p.canon.decisions);
 const candidate=proposeWhatIfToMain(p,branch.id,idea.id);
 assert.equal(candidate.status,'candidate');assert.deepEqual(p.canon.decisions[0],before[0]);assert.equal(activeRules(p).length,0);
});

test('backup includes guard rules and evidence, v1.1.0 projects still initialize',async()=>{
 const p=setup(),d=await canon(p);addGuardRule(p,rule(d));attach(p,p.shots[0],d);addShotClaim(p,p.shots[0].id,claim());
 const restored=validateImportedProject(projectFromZip(projectToZip(p)));ensureGuards(restored);
 assert.equal(inspectShot(restored,restored.shots[0].id).status,'verified');assert.equal(restored.guards.rules.length,1);
 const legacy=newProject('v1.1');delete legacy.guards;ensureGuards(legacy);assert.deepEqual(legacy.guards.rules,[]);
});

test('input validation prevents out-of-range episodes and invalid AI claims',()=>{
 assert.throws(()=>normalizeAIGuardClaims([{...claim(),episode:0}]),/1~999/);
 assert.throws(()=>normalizeAIGuardClaims([{...claim(),kind:'admin'}]),/유형/);
 assert.throws(()=>normalizeAIGuardClaims(new Array(61).fill(claim())),/60개/);
});

test('public approveShot entrypoint cannot bypass evidence guard',async()=>{
 const {approveShot,exportApprovedSeedancePrompt}=await import('../web/core.mjs');
 const p=setup(),d=await canon(p);
 assert.throws(()=>approveShot(p,p.shots[0].id),/충돌/);
 assert.throws(()=>exportApprovedSeedancePrompt(p,p.shots[0].id),/승인된 샷/);
 attach(p,p.shots[0],d);
 assert.throws(()=>approveShot(p,p.shots[0].id),/근거/);
 attestShotReview(p,p.shots[0].id,{reason:'샷이 연결된 정설과 충돌하지 않는지 직접 확인했습니다.'});
 approveShot(p,p.shots[0].id);
 assert.equal(exportApprovedSeedancePrompt(p,p.shots[0].id),'8s film');
 editShot(p,p.shots[0].id,{action:'새로운 사건이 벌어진다'});
 assert.throws(()=>exportApprovedSeedancePrompt(p,p.shots[0].id),/승인된 샷/);
});

test('empty canon never gives an automatic verified badge',()=>{
 const p=setup();assert.equal(inspectShot(p,p.shots[0].id).status,'unverified');
 assert.ok(inspectShot(p,p.shots[0].id).unverified.some(x=>x.code==='CANON_EMPTY'));
});

test('timeline requires a precise episode instead of accepting a vague span',async()=>{
 const p=setup(),d=await canon(p,'사건이 3화에 발생한다.','timeline');
 assert.throws(()=>addGuardRule(p,rule(d,{kind:'timeline',subject:'EV2',attribute:'발생',value:'있음',startEpisode:3,endEpisode:999})),/시작·종료/);
});
