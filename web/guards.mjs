import {seriesSignature} from './series.mjs';
/**
 * DramaForge v1.2.0 evidence-first checks.
 * Facts are author-attested interpretations of previously approved canon.
 * These deterministic checks do NOT infer semantics from natural-language scripts.
 */
import { ensureCanon, findSimilarDecisions } from './canon.mjs';

const kinds = new Set(['character', 'knowledge', 'timeline']);
const clean = (x, max=180) => typeof x === 'string' ? x.trim().slice(0,max) : '';
const normalize = s => clean(s,500).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ');
const makeId = p => `${p}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const required = (v,name) => { const s=clean(v);if(!s)throw new Error(`${name}은(는) 필수입니다.`);return s;};
function episode(value, fallback) {
  const n=Number(value===undefined||value===null||value===''?fallback:value);
  if(!Number.isSafeInteger(n)||n<1||n>999)throw new Error('에피소드는 1~999 사이의 정수여야 합니다.');
  return n;
}
function fields(value) {
  if(!kinds.has(value?.kind))throw new Error('규칙 유형은 인물·지식·연표 중 하나여야 합니다.');
  const startEpisode=episode(value.startEpisode,1),endEpisode=episode(value.endEpisode,value.kind==='timeline'?startEpisode:999);
  if(endEpisode<startEpisode)throw new Error('종료 회차가 시작 회차보다 빠를 수 없습니다.');
  if(value.kind==='timeline' && endEpisode!==startEpisode)throw new Error('사건 연표의 발생 회차는 시작·종료 회차가 같아야 합니다.');
  return {kind:value.kind,subject:required(value.subject,'주체'),attribute:required(value.attribute,'속성'),value:required(String(value.value??''),'값'),startEpisode,endEpisode};
}
function claimFields(value){
  if(!kinds.has(value?.kind))throw new Error('검증 사실 유형이 잘못되었습니다.');
  return {kind:value.kind,subject:required(value.subject,'주체'),attribute:required(value.attribute,'속성'),value:required(String(value.value??''),'값'),episode:episode(value.episode,1)};
}
function key(x){return `${x.kind}|${normalize(x.subject)}|${normalize(x.attribute)}`;}
const intersect=(a,b)=>a.startEpisode<=b.endEpisode&&b.startEpisode<=a.endEpisode;
export function ensureGuards(project){
  ensureCanon(project);
  if(!project.guards || typeof project.guards!=='object')project.guards={schemaVersion:1,rules:[],audit:[]};
  for(const field of ['rules','audit'])if(!Array.isArray(project.guards[field]))project.guards[field]=[];
  if(project.guards.schemaVersion!==1)throw new Error('지원하지 않는 검증 규칙 버전입니다.');
  for(const shot of project.shots||[])if(!Array.isArray(shot.guardClaims))shot.guardClaims=[];
  return project;
}
function record(project,event,detail){project.guards.audit.push({id:makeId('guardlog'),at:now(),event,detail});project.updatedAt=now();project.revision=(project.revision||0)+1;}
function deapproveShot(project,shot,reason){
  if(shot.status==='approved'){
    shot.status='needs_review';shot.approvedFingerprint=null;
    project.history ||= [];
    project.history.push({at:now(),event:'approval_invalidated',shotId:shot.id,reason});
  }
}
/** Approved rules are tied to canon version; changes make prior extracted rules stale. */
export function addGuardRule(project,data,{actor='author'}={}){
  if(actor!=='author')throw new Error('검증 기준 등록은 작가만 승인할 수 있습니다.');
  ensureGuards(project);
  const canon=project.canon.decisions.find(d=>d.id===data?.decisionId&&d.status==='approved');
  if(!canon)throw new Error('승인된 정설을 근거로 하는 규칙만 등록할 수 있습니다.');
  const parsed=fields(data);
  const rule={id:makeId('rule'),decisionId:canon.id,decisionVersion:canon.version,...parsed,createdAt:now(),approvedBy:'author'};
  const active=project.guards.rules.filter(r=>{
    const d=project.canon.decisions.find(x=>x.id===r.decisionId);
    return d?.status==='approved'&&d.version===r.decisionVersion;
  });
  if(active.some(r=>key(r)===key(rule)&&(intersect(r,rule)||r.kind==='timeline')&&normalize(r.value)!==normalize(rule.value)))
    throw new Error('승인된 검증 기준과 동일 회차의 상태가 충돌합니다. 기존 정설에 변경 요청을 먼저 등록하세요.');
  if(active.some(r=>key(r)===key(rule)&&(intersect(r,rule)||r.kind==='timeline')&&normalize(r.value)===normalize(rule.value)))
    throw new Error('동일한 검증 기준이 이미 등록되어 있습니다.');
  project.guards.rules.push(rule);
  for(const shot of project.shots||[])deapproveShot(project,shot,'검증 기준 추가');
  record(project,'rule_registered',{ruleId:rule.id,decisionId:canon.id,decisionVersion:canon.version});
  return rule;
}
export function activeRules(project){
  ensureGuards(project);
  return project.guards.rules.filter(r=>{
    const d=project.canon.decisions.find(x=>x.id===r.decisionId);
    return d?.status==='approved' && d.version===r.decisionVersion;
  });
}
export function staleRules(project){
  ensureGuards(project);const activeIds=new Set(activeRules(project).map(x=>x.id));
  return project.guards.rules.filter(x=>!activeIds.has(x.id));
}
export function addShotClaim(project,shotId,input){
  ensureGuards(project);const shot=project.shots.find(s=>s.id===shotId);if(!shot)throw new Error('샷을 찾지 못했습니다.');
  if(shot.guardClaims.length>=60)throw new Error('샷 당 검증 사실은 최대 60개입니다.');
  const claim={id:makeId('claim'),...claimFields(input),origin:'author',createdAt:now()};
  if(shot.guardClaims.some(x=>key(x)===key(claim)&&x.episode===claim.episode&&normalize(x.value)===normalize(claim.value)))throw new Error('동일 검증 사실이 이미 있습니다.');
  shot.guardClaims.push(claim);deapproveShot(project,shot,'검증 사실 추가');record(project,'claim_added',{shotId,claimId:claim.id});return claim;
}
export function removeShotClaim(project,shotId,claimId){
  ensureGuards(project);const shot=project.shots.find(s=>s.id===shotId);if(!shot)throw new Error('샷을 찾지 못했습니다.');
  const idx=shot.guardClaims.findIndex(c=>c.id===claimId);if(idx<0)throw new Error('검증 사실을 찾지 못했습니다.');
  shot.guardClaims.splice(idx,1);deapproveShot(project,shot,'검증 사실 삭제');record(project,'claim_removed',{shotId,claimId});
}
export function normalizeAIGuardClaims(raw){
  if(raw===undefined||raw===null)return [];
  if(!Array.isArray(raw)||raw.length>60)throw new Error('AI 검증 사실은 배열이며 60개 이하여야 합니다.');
  return raw.map(x=>({id:makeId('claim'),...claimFields(x),origin:'ai',createdAt:now()}));
}
function reportSignature(project,shot){
  const approved=project.canon.decisions.filter(x=>x.status==='approved').map(x=>[x.id,x.version,x.approvalHash]).sort((a,b)=>a[0].localeCompare(b[0]));
  const rules=project.guards.rules.map(x=>[x.id,x.decisionVersion,x.kind,x.subject,x.attribute,x.value,x.startEpisode,x.endEpisode]).sort((a,b)=>a[0].localeCompare(b[0]));
  return JSON.stringify({approved,rules,episodeSignature:shot.episodeNumber==null?null:seriesSignature(project,shot.episodeNumber),shot:{id:shot.id,scene:shot.scene,title:shot.title,action:shot.action,camera:shot.camera,location:shot.location,characters:shot.characters,outfit:shot.outfit,props:shot.props,dialogue:shot.dialogue,sound:shot.sound,duration:shot.duration,prompt:shot.prompt,canonRefs:shot.canonRefs,dependsOnShotIds:shot.dependsOnShotIds||[],claims:shot.guardClaims},script:project.script,visualBible:project.visualBible});
}
/** Report is computed on demand. An AI-derived claim is not treated as proof by itself. */
export function inspectShot(project,shotId){
  ensureGuards(project);
  const shot=project.shots.find(s=>s.id===shotId);if(!shot)throw new Error('샷을 찾지 못했습니다.');
  const approved=project.canon.decisions.filter(x=>x.status==='approved');
  const approvedIds=new Set(approved.map(x=>x.id));
  const refs=shot.canonRefs||[];const unknownRefs=refs.filter(x=>!approvedIds.has(x));
  const active=activeRules(project);
  const stale=staleRules(project).filter(r=>refs.includes(r.decisionId));
  const relevant=active.filter(r=>refs.includes(r.decisionId));
  const conflicts=[],matches=[],unverified=[];
  if(!approved.length)unverified.push({code:'CANON_EMPTY',message:'승인 정설이 아직 없어 자동으로 내용 일관성을 검증할 수 없습니다.'});
  if(approved.length && !refs.length)conflicts.push({code:'CANON_UNLINKED',message:'승인 정설과 연결되지 않았습니다. 최소 한 개를 연결해야 합니다.'});
  if(unknownRefs.length)conflicts.push({code:'CANON_REFERENCE_INVALID',refs:unknownRefs,message:'승인 상태가 아닌 정설을 참조합니다.'});
  for(const rule of stale)unverified.push({code:'RULE_STALE',ruleId:rule.id,message:'참조 정설이 변경되어 검사 기준을 다시 확정해야 합니다.'});
  for(const claim of shot.guardClaims||[]){
    const sameKey=relevant.filter(r=>key(r)===key(claim));
    if(claim.kind==='timeline'&&sameKey.length&&sameKey.some(r=>r.startEpisode!==claim.episode)){
      for(const rule of sameKey.filter(r=>r.startEpisode!==claim.episode))conflicts.push({code:'TIMELINE_MISMATCH',claimId:claim.id,ruleId:rule.id,decisionId:rule.decisionId,expected:`${rule.startEpisode}화`,actual:`${claim.episode}화`,message:`${claim.subject}/${claim.attribute} 사건은 ${rule.startEpisode}화로 확정됐지만 ${claim.episode}화로 제시됐습니다.`});
      continue;
    }
    let applicable=sameKey.filter(r=>r.startEpisode<=claim.episode&&r.endEpisode>=claim.episode);
    if(!applicable.length){unverified.push({code:'NO_CANON_EVIDENCE',claimId:claim.id,message:`${claim.subject}/${claim.attribute} (${claim.episode}화)의 승인 기준이 없습니다.`});continue;}
    if(claim.origin==='ai')unverified.push({code:'AI_CLAIM_UNVERIFIED',claimId:claim.id,message:'AI가 추출한 사실은 실제 대본과의 일치 여부를 작가가 확인해야 합니다.'});
    for(const rule of applicable){
      if(normalize(rule.value)===normalize(claim.value))matches.push({claimId:claim.id,ruleId:rule.id,decisionId:rule.decisionId});
      else conflicts.push({code:'CONTRADICTION',claimId:claim.id,ruleId:rule.id,decisionId:rule.decisionId,expected:rule.value,actual:claim.value,message:`${claim.subject}/${claim.attribute}: ${claim.value} ↔ 정설 ${rule.value}`});
    }
  }
  for(const rule of relevant){
    if(!matches.some(m=>m.ruleId===rule.id) && !conflicts.some(m=>m.ruleId===rule.id))
      unverified.push({code:'MISSING_EVIDENCE',ruleId:rule.id,message:`${rule.subject}/${rule.attribute}의 샷별 근거가 없습니다.`});
  }
  if(approved.length && !relevant.length)unverified.push({code:'NO_ACTIVE_RULE',message:'연결된 정설에 구조화된 검증 기준이 없습니다.'});
  const signature=reportSignature(project,shot);
  const humanReviewValid=!!(shot.guardReview?.signature===signature&&shot.guardReview?.actor==='author'&&clean(shot.guardReview?.reason,2000).length>=12);
  const status=conflicts.length?'blocked':unverified.length?(humanReviewValid?'reviewed':'unverified'):'verified';
  return {shotId,checkedAt:now(),status,conflicts,matches,unverified,humanReviewValid,
    eligible:!conflicts.length&&(!unverified.length||humanReviewValid),signature,
    coverage:{approvedCanon:approved.length,linked:refs.length,activeRules:relevant.length,claims:shot.guardClaims.length}};
}
export function attestShotReview(project,shotId,{actor='author',reason}={}){
  if(actor!=='author')throw new Error('근거 검토는 작가만 승인할 수 있습니다.');
  const report=inspectShot(project,shotId);
  if(report.conflicts.length)throw new Error('정설과 충돌하는 사실은 수동 확인만으로 통과시킬 수 없습니다. 먼저 수정 또는 정설 변경 요청이 필요합니다.');
  const note=clean(reason,1200);if(note.length<12)throw new Error('검토 근거는 12자 이상으로 구체적으로 기록하세요.');
  const shot=project.shots.find(s=>s.id===shotId);
  shot.guardReview={actor:'author',reason:note,signature:report.signature,at:now()};
  record(project,'manual_review_attested',{shotId,reason:note});return inspectShot(project,shotId);
}
export function assertShotGuardReady(project,shotId){
  const report=inspectShot(project,shotId);
  if(!report.eligible)throw new Error(report.status==='blocked'?'정설 충돌이 해결되지 않아 샷을 승인할 수 없습니다.':'검증 근거가 불충분합니다. 작가 검토 기록 후 승인하세요.');
  return report;
}
export function inspectProposal(project,statement){
  ensureGuards(project);
  const hits=findSimilarDecisions(project,statement,0.72);
  return {exactOrSimilar:hits.map(x=>({...x,requiresChangedPremise:x.status==='rejected'})),
    caution:hits.some(x=>x.status==='rejected')?'기각 이력이 있습니다. 재검토에는 전제 변경 근거가 필요합니다.':hits.some(x=>x.status==='approved')?'승인된 결정과 비교하세요.':''};
}
