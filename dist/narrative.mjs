/**
 * DramaForge v1.6 — ContinuityMemory-derived narrative contracts.
 * Separate, author-gated ledger; never overwrite approved series/canon.
 * World truth, character belief and audience belief have independent states.
 * Strict blocks are limited to approved explicit graph / tagged constraints.
 */
const TYPES=new Set(['causality','perspective','timeline']);
const now=()=>new Date().toISOString();
const uid=p=>`${p}_${crypto.randomUUID()}`;
const trim=(x,max=2000)=>typeof x==='string'?x.trim().slice(0,max):'';
const int=(value,label,{optional=false,max=999}={})=>{
 if((value===undefined||value===null||value==='')&&optional)return null;
 const n=Number(value);if(!Number.isInteger(n)||n<1||n>max)throw Error(`${label}: 1~${max}의 정수가 필요합니다.`);return n;
};
const episode=(p,n,label='회차')=>{
 const value=int(n,label);if(!p.series?.episodes?.some(e=>e.number===value))throw Error(`${label}: 등록되지 않은 ${value}화입니다.`);return value;
};
const event=(p,id)=>p.series?.records?.find(r=>r.id===id&&r.type==='event'&&r.status==='approved');
const eventRevision=(p,id)=>event(p,id)?.revision??null;
const latest=(r)=>r.versions?.at(-1);
function audit(p,action,detail){p.narrative.audit.push({id:uid('narlog'),at:now(),action,detail});p.revision=(p.revision||0)+1;p.updatedAt=now();}
function invalidate(p,reason){let count=0;for(const shot of p.shots||[])if(shot.status==='approved'){shot.status='needs_review';shot.approvedFingerprint=null;count++;}if(count){p.history??=[];p.history.push({at:now(),event:'approval_invalidated',reason,count});}}
function fields(type,data,p){
 if(type==='causality'){
  const causeEventId=trim(data.causeEventId,120),effectEventId=trim(data.effectEventId,120);
  if(!event(p,causeEventId)||!event(p,effectEventId))throw Error('원인과 결과는 작가가 승인한 사건을 참조해야 합니다.');
  if(causeEventId===effectEventId)throw Error('사건 자신이 자신의 원인일 수 없습니다.');
  const reason=trim(data.reason,1200),prerequisite=trim(data.prerequisite,1200);
  if(!reason||!prerequisite)throw Error('인과 근거와 선행 조건은 필수입니다.');
  return {causeEventId,effectEventId,reason,prerequisite,exception:trim(data.exception,1000),sourceQuote:trim(data.sourceQuote,600)};
 }
 if(type==='timeline'){
  const eventId=trim(data.eventId,120);if(!event(p,eventId))throw Error('승인된 사건을 선택해야 합니다.');
  return {eventId,worldOrder:int(data.worldOrder,'극중 순서',{max:100000}),worldTime:trim(data.worldTime,180),audienceEpisode:episode(p,data.audienceEpisode,'관객 공개 회차'),audienceScene:trim(data.audienceScene,100),sourceQuote:trim(data.sourceQuote,600)};
 }
 const worldTruth=trim(data.worldTruth,1200),character=trim(data.character,120),characterBelief=trim(data.characterBelief,1200),audienceBelief=trim(data.audienceBelief,1200);
 if(!worldTruth)throw Error('세계관의 진실을 입력하세요.');
 if(characterBelief&&!character)throw Error('인물의 믿음에는 해당 인물이 필요합니다.');
 if(!characterBelief&&!audienceBelief)throw Error('인물 또는 관객의 믿음이 하나 이상 필요합니다.');
 const characterLearnEpisode=int(data.characterLearnEpisode,'인물 믿음 시작 회차',{optional:true});
 const audienceMisleadEpisode=int(data.audienceMisleadEpisode,'오해 유도 회차',{optional:true});
 const truthRevealEpisode=int(data.truthRevealEpisode,'진실 공개 회차',{optional:true});
 for(const n of [characterLearnEpisode,audienceMisleadEpisode,truthRevealEpisode])if(n!==null)episode(p,n);
 if(characterBelief&&characterLearnEpisode===null)throw Error('인물의 믿음 시작 회차가 필요합니다.');
 if(audienceBelief&&audienceMisleadEpisode===null)throw Error('관객의 믿음 시작 회차가 필요합니다.');
 if(audienceMisleadEpisode!==null&&truthRevealEpisode!==null&&truthRevealEpisode<audienceMisleadEpisode)throw Error('진실 공개는 오해 유도보다 먼저일 수 없습니다.');
 const intentionalMisdirection=!!data.intentionalMisdirection;
 if(intentionalMisdirection&&!trim(data.directorIntent,600))throw Error('의도적인 오해·반전은 작가의 연출 의도가 필요합니다.');
 return {worldTruth,character,characterBelief,audienceBelief,characterLearnEpisode,audienceMisleadEpisode,truthRevealEpisode,intentionalMisdirection,directorIntent:trim(data.directorIntent,600),sourceQuote:trim(data.sourceQuote,600)};
}
const dataFields={
 causality:['causeEventId','effectEventId','reason','prerequisite','exception','sourceQuote'],
 timeline:['eventId','worldOrder','worldTime','audienceEpisode','audienceScene','sourceQuote'],
 perspective:['worldTruth','character','characterBelief','audienceBelief','characterLearnEpisode','audienceMisleadEpisode','truthRevealEpisode','intentionalMisdirection','directorIntent','sourceQuote']
};
function recordData(r){return Object.fromEntries(dataFields[r.type].map(k=>[k,r[k]]));}
function dependencies(p,r){if(r.type==='causality')return {[r.causeEventId]:eventRevision(p,r.causeEventId),[r.effectEventId]:eventRevision(p,r.effectEventId)};if(r.type==='timeline')return {[r.eventId]:eventRevision(p,r.eventId)};return {};}
export function ensureNarrative(project){
 if(!project||typeof project!=='object')throw Error('유효한 작품이 아닙니다.');
 if(!project.narrative)project.narrative={schemaVersion:1,records:[],changes:[],audit:[],reviews:[]};
 const s=project.narrative;
 if(s.reviews===undefined)s.reviews=[]; // legacy v1.6 development ZIP migration
 if(s.schemaVersion!==1)throw Error('지원하지 않는 서사 기억 버전입니다.');
 for(const key of ['records','changes','audit','reviews'])if(!Array.isArray(s[key]))throw Error(`서사 기억 ${key} 형식 오류`);
 if(s.records.length>2000||s.changes.length>2000||s.audit.length>20000||s.reviews.length>1200)throw Error('서사 기억 용량 제한을 초과했습니다.');
 const ids=new Set();
 for(const r of s.records){
  if(!r||typeof r.id!=='string'||ids.has(r.id)||!TYPES.has(r.type)||!['candidate','approved','rejected'].includes(r.status))throw Error('서사 기억 기록이 손상되었습니다.');
  ids.add(r.id);
  if(r.status==='approved'){
   const v=latest(r);
   if(!v||v.revision!==r.revision||JSON.stringify(v.data)!==JSON.stringify(recordData(r)))throw Error(`승인된 서사 기억이 승인본과 다릅니다: ${r.id}`);
  }
 }
 return s;
}
function duplicate(p,type,data,exceptId){
 return p.narrative.records.filter(r=>r.type===type&&r.status==='approved'&&r.id!==exceptId).some(r=>type==='causality'?r.causeEventId===data.causeEventId&&r.effectEventId===data.effectEventId:type==='timeline'?r.eventId===data.eventId: r.worldTruth===data.worldTruth&&r.character===data.character&&r.audienceBelief===data.audienceBelief);
}
function graphEdges(p,overrideId,override){return p.narrative.records.filter(r=>r.type==='causality'&&r.status==='approved'&&r.id!==overrideId).concat(override?[override]:[]).map(x=>[x.causeEventId,x.effectEventId]);}
function checkCycle(edges){const next=new Map();for(const [a,b] of edges){next.set(a,[...(next.get(a)||[]),b]);}const color=new Map();const visit=id=>{if(color.get(id)===1)throw Error('승인된 인과 그래프에 순환 원인이 생깁니다.');if(color.get(id)===2)return;color.set(id,1);for(const v of next.get(id)||[])visit(v);color.set(id,2);};for(const k of next.keys())visit(k);}
function timelineFor(p,id,exclude){return p.narrative.records.find(r=>r.id!==exclude&&r.type==='timeline'&&r.status==='approved'&&r.eventId===id);}
function validateRelations(p,type,data,exclude){
 if(duplicate(p,type,data,exclude))throw Error('같은 관계의 승인된 기록이 있습니다. 변경 요청을 사용하세요.');
 if(type==='causality'){
  checkCycle(graphEdges(p,exclude,{type,...data}));
  const a=timelineFor(p,data.causeEventId),b=timelineFor(p,data.effectEventId);
  if(a&&b&&a.worldOrder>=b.worldOrder)throw Error('극중 시간상 결과가 원인보다 빠르거나 같습니다.');
 }
 if(type==='timeline'){
  const candidates=p.narrative.records.filter(r=>r.status==='approved'&&r.type==='causality');
  for(const r of candidates){const a=r.causeEventId===data.eventId?data:timelineFor(p,r.causeEventId,exclude);const b=r.effectEventId===data.eventId?data:timelineFor(p,r.effectEventId,exclude);if(a&&b&&a.worldOrder>=b.worldOrder)throw Error('이 시간 배치는 승인된 사건의 인과관계와 충돌합니다.');}
 }
}
export function createNarrativeCandidate(p,type,input,{actor='author'}={}){
 if(actor!=='author')throw Error('작가만 서사 기록 후보를 등록할 수 있습니다.');
 const s=ensureNarrative(p);if(!TYPES.has(type))throw Error('지원하지 않는 서사 기록 유형입니다.');
 const data=fields(type,input,p);if(s.records.length>=2000)throw Error('서사 기록 개수가 초과됐습니다.');
 const r={id:uid('narrative'),type,status:'candidate',revision:1,...data,versions:[],createdAt:now(),updatedAt:now()};
 s.records.push(r);audit(p,'candidate',{id:r.id,type});return r;
}
export function decideNarrativeCandidate(p,id,action,{actor='author',expectedRevision}={}){
 if(actor!=='author')throw Error('작가만 서사 기억을 승인할 수 있습니다.');
 const s=ensureNarrative(p),r=s.records.find(x=>x.id===id&&x.status==='candidate');if(!r)throw Error('승인 대기 서사 기록이 없습니다.');
 if(r.revision!==expectedRevision)throw Error('이전 버전입니다. 최신 기록을 확인하세요.');
 if(!['approved','rejected'].includes(action))throw Error('승인 또는 기각만 가능합니다.');
 if(action==='approved'){
  const data=fields(r.type,r,p);validateRelations(p,r.type,data,r.id);
  r.versions.push({revision:r.revision,data:recordData(r),eventRevisions:dependencies(p,r),approvedAt:now()});invalidate(p,'서사 기억 승인');
 }
 r.status=action;r.updatedAt=now();audit(p,'decision',{id,action});return r;
}
export function proposeNarrativeChange(p,id,patch,{actor='author'}={}){
 if(actor!=='author')throw Error('작가만 서사 변경을 요청할 수 있습니다.');
 const s=ensureNarrative(p),r=s.records.find(x=>x.id===id&&x.status==='approved');if(!r)throw Error('승인된 기록을 찾지 못했습니다.');
 const after=fields(r.type,{...recordData(r),...patch},p);
 if(JSON.stringify(recordData(r))===JSON.stringify(after))throw Error('변경된 값이 없습니다.');
 const cr={id:uid('narrativechange'),recordId:id,baseRevision:r.revision,before:recordData(r),after,status:'pending',at:now()};s.changes.push(cr);audit(p,'change_proposed',{id:cr.id,recordId:id});return cr;
}
export function resolveNarrativeChange(p,id,{actor='author',approve=false}={}){
 if(actor!=='author')throw Error('작가만 서사 변경을 확정할 수 있습니다.');
 const s=ensureNarrative(p),cr=s.changes.find(x=>x.id===id&&x.status==='pending'),r=s.records.find(x=>x.id===cr?.recordId);
 if(!cr||!r||r.status!=='approved'||r.revision!==cr.baseRevision)throw Error('변경 요청이 오래되었거나 존재하지 않습니다.');
 if(approve){const data=fields(r.type,cr.after,p);validateRelations(p,r.type,data,r.id);Object.assign(r,data);r.revision++;r.versions.push({revision:r.revision,data:recordData(r),eventRevisions:dependencies(p,r),approvedAt:now(),changeId:cr.id});r.updatedAt=now();invalidate(p,'서사 기억 변경 승인');}
 cr.status=approve?'approved':'rejected';cr.resolvedAt=now();audit(p,'change_resolved',{id,approve});return cr;
}
function staleDependency(p,r){const vers=latest(r)?.eventRevisions||{};return Object.entries(vers).filter(([id,rev])=>eventRevision(p,id)!==rev);}
/** Read-only, evidence-limited check. Calls out unknown evidence separately. */
export function inspectNarrative(p,number,{draftText}={}){
 const s=ensureNarrative(p);const n=int(number,'검사 회차');
 const ep=p.series?.episodes?.find(e=>e.number===n);if(!ep)throw Error('검사할 회차가 존재하지 않습니다.');
 const source=typeof draftText==='string'?draftText:ep.script;
 const approved=s.records.filter(r=>r.status==='approved'),issues=[];
 const add=(severity,code,message,referenceId,detail='')=>issues.push({severity,priority:severity==='blocked'?'critical':severity==='warning'?'important':'minor',code,message,referenceId,evidence:detail});
 for(const r of approved){
  if(staleDependency(p,r).length)add('blocked','NARRATIVE_DEPENDENCY_STALE','인과관계·시간축 기록이 이전 사건 승인본을 참조합니다. 변경 요청을 검토하세요.',r.id);
  if(r.type==='causality'){
   const cause=event(p,r.causeEventId),effect=event(p,r.effectEventId);
   if(!cause||!effect)add('blocked','MISSING_CAUSAL_EVENT','연결된 승인 사건을 찾지 못했습니다.',r.id);
   const a=timelineFor(p,r.causeEventId),b=timelineFor(p,r.effectEventId);
   if(a&&b&&a.worldOrder>=b.worldOrder)add('blocked','CAUSAL_WORLD_ORDER','원인의 극중 시간이 결과보다 앞서야 합니다.',r.id);
   if(effect?.episode===n&&!source.includes(r.prerequisite))add('unverified','PREREQUISITE_NOT_EVIDENCED','결과 사건의 선행 조건이 원고에 명시적으로 확인되지 않습니다. 장면 밖의 원인이 있을 수 있습니다.',r.id,r.prerequisite);
   if(effect?.episode===n&&effect&&cause&&cause.episode>effect.episode)add('warning','CAUSAL_REVEAL_ORDER','결과가 원인보다 먼저 공개됩니다. 회상·역순 서사 등 의도된 연출인지 검토하세요.',r.id);
  }
  if(r.type==='timeline'){
   if(r.audienceEpisode===n && !source.includes(event(p,r.eventId)?.title||'\0')) add('unverified','REVEAL_NOT_EVIDENCED','관객에게 공개하기로 한 사건이 원고의 단순 문구 검사에서 확인되지 않습니다.',r.id);
  }
  if(r.type==='perspective'){
   const watched=source.includes(`[[AUDIENCE_BELIEF:${r.id}]]`);
   const known=source.includes(`[[REVEAL_TRUTH:${r.id}]]`);
   if(watched && (r.audienceMisleadEpisode===null||n<r.audienceMisleadEpisode))add('blocked','PREMATURE_AUDIENCE_BELIEF','구조화 태그가 승인된 관객 믿음 시작보다 빠릅니다.',r.id);
   if(known&&(r.truthRevealEpisode===null||n<r.truthRevealEpisode))add('blocked','PREMATURE_TRUTH_REVEAL','구조화 태그가 승인된 진실 공개 시점보다 빠릅니다.',r.id);
   if(r.audienceBelief&&r.audienceMisleadEpisode!==null&&n<r.audienceMisleadEpisode&&source.includes(r.audienceBelief))add('warning','POSSIBLE_EARLY_MISDIRECTION','관객 오해 표현이 계획된 회차보다 먼저 나타납니다. 실제 정보 공개인지 확인하세요.',r.id,r.audienceBelief);
  }
 }
 const status=issues.some(i=>i.severity==='blocked')?'blocked':issues.length?'needs_review':'no_detected_issue';
 return {episode:n,status,issues,checkedAt:now(),limitations:'명시적 태그/승인된 의존성만 확정 검사합니다. 자연어 원인·오해·반전은 검토 제안입니다.'};
}
export function narrativeState(p,n){
 const s=ensureNarrative(p),episodeNo=int(n,'회차'),approved=s.records.filter(r=>r.status==='approved');
 const perspectives=approved.filter(r=>r.type==='perspective').map(r=>({id:r.id,worldTruth:r.worldTruth,character:r.character,characterBelief:r.characterBelief,characterState:r.characterLearnEpisode===null?'not_recorded':episodeNo<r.characterLearnEpisode?'unknown':'believes',audienceBelief:r.audienceBelief,audienceState:r.audienceMisleadEpisode===null||episodeNo<r.audienceMisleadEpisode?'unrevealed':r.truthRevealEpisode!==null&&episodeNo>=r.truthRevealEpisode?'truth_revealed':'believes',truthRevealEpisode:r.truthRevealEpisode,intentionalMisdirection:r.intentionalMisdirection}));
 const chronology=approved.filter(r=>r.type==='timeline').map(r=>({id:r.id,eventId:r.eventId,worldOrder:r.worldOrder,worldTime:r.worldTime,audienceEpisode:r.audienceEpisode,audienceScene:r.audienceScene,approvedAt:latest(r)?.approvedAt||null,revision:r.revision})).sort((a,b)=>a.worldOrder-b.worldOrder);
 const causal=approved.filter(r=>r.type==='causality').map(r=>({id:r.id,causeEventId:r.causeEventId,effectEventId:r.effectEventId,reason:r.reason,prerequisite:r.prerequisite,exception:r.exception,stale:!!staleDependency(p,r).length}));
 return {episode:episodeNo,perspectives,chronology,causal};
}
export function narrativeSignature(p){const s=ensureNarrative(p);return JSON.stringify(s.records.filter(r=>r.status==='approved').map(r=>[r.id,r.revision,r.type,recordData(r),latest(r)?.eventRevisions]));}
export function narrativePromptContext(p,{maxLength=6500}={}){
 const s=ensureNarrative(p),records=s.records.filter(r=>r.status==='approved');
 const lines=['[승인된 서사 인과/정보 상태: 작가 허가 없이 변경 금지]'];
 for(const r of records){if(r.type==='causality')lines.push(`CAUSE ${r.id}: ${r.causeEventId} → ${r.effectEventId}; 선행 ${r.prerequisite}; 이유 ${r.reason}; 예외 ${r.exception||'없음'}`);
 else if(r.type==='timeline')lines.push(`TIME ${r.id}: ${r.eventId}; 극중 순서 ${r.worldOrder}; 극중 시점 ${r.worldTime||'미정'}; 관객 공개 ${r.audienceEpisode}화 ${r.audienceScene}; 승인 시각 ${latest(r)?.approvedAt||'미정'}`);
 else lines.push(`PERSPECTIVE ${r.id}: 실제 진실 ${r.worldTruth}; 인물 ${r.character||'없음'}의 믿음 ${r.characterBelief||'없음'}(시작 ${r.characterLearnEpisode??'미정'}화); 관객 믿음 ${r.audienceBelief||'없음'}(시작 ${r.audienceMisleadEpisode??'미정'}화); 진실 공개 ${r.truthRevealEpisode??'미정'}화; 연출 의도 ${r.directorIntent||'없음'}`);}
 lines.push('승인된 기록만 사실로 사용하세요. 화면 공개 시점과 세계관 발생 시점, 작가의 수정 시점을 혼동하지 마세요.');
 const value=lines.join('\n');if(value.length>maxLength)throw Error('서사 정설 맥락이 제한 길이를 초과했습니다. 기록을 분할하세요.');return value;
}
export function narrativeReviewSignature(p,number){
 const s=ensureNarrative(p),n=int(number,'회차'),ep=p.series?.episodes?.find(e=>e.number===n);if(!ep)throw Error('회차가 없습니다.');
 return JSON.stringify([ep.revision,ep.script, p.series.records.filter(r=>r.status==='approved').map(r=>[r.id,r.revision]), s.records.filter(r=>r.status==='approved').map(r=>[r.id,r.revision,latest(r)?.eventRevisions])]);
}
export function narrativeReviewCurrent(p,number){
 const n=int(number,'회차'),s=ensureNarrative(p),record=[...s.reviews].reverse().find(x=>x.episode===n);
 return !!record&&record.signature===narrativeReviewSignature(p,n);
}
export function acknowledgeNarrativeIssues(p,number,reason,{actor='author'}={}){
 if(actor!=='author')throw Error('작가만 연속성 문제를 검토 완료할 수 있습니다.');
 const n=episode(p,number),report=inspectNarrative(p,n);
 if(report.issues.some(i=>i.severity==='blocked'))throw Error('치명적 구조 충돌은 검토 확인만으로 해제할 수 없습니다.');
 if(!report.issues.some(i=>i.priority==='important'))throw Error('작가 검토가 필요한 중요 경고가 없습니다.');
 const note=trim(reason,800);if(note.length<10)throw Error('작가의 검토 근거를 10자 이상 입력해야 합니다.');
 const result={id:uid('narreview'),episode:n,signature:narrativeReviewSignature(p,n),reason:note,issueIds:report.issues.filter(i=>i.priority==='important').map(i=>i.referenceId),at:now(),actor};
 p.narrative.reviews.push(result);audit(p,'author_review',{episode:n,id:result.id});return result;
}
export function assertNarrativeReviewForEpisode(p,number){
 const report=inspectNarrative(p,number);
 if(report.issues.some(i=>i.severity==='blocked'))throw Error('서사 기억에 치명적 충돌이 있습니다. 기존 결정과 시점을 수정하세요.');
 if(report.issues.some(i=>i.priority==='important')&&!narrativeReviewCurrent(p,number))throw Error('서사 기억의 중요 경고를 작가가 검토하고 근거를 기록해야 승인할 수 있습니다.');
 return report;
}
export function refreshNarrativeDependencies(p,id,{actor='author'}={}){
 if(actor!=='author')throw Error('작가만 사건 변경 이후 기록을 재검증할 수 있습니다.');
 const s=ensureNarrative(p),r=s.records.find(x=>x.id===id&&x.status==='approved');
 if(!r||!['timeline','causality'].includes(r.type))throw Error('승인된 사건 의존 기록을 선택하세요.');
 if(!staleDependency(p,r).length)throw Error('재확인이 필요한 변경 사건이 없습니다.');
 const data=fields(r.type,r,p);validateRelations(p,r.type,data,r.id);
 r.revision++;r.versions.push({revision:r.revision,data:recordData(r),eventRevisions:dependencies(p,r),approvedAt:now(),reauthorized:true});r.updatedAt=now();
 invalidate(p,'사건 의존성 재검증');audit(p,'dependency_reconfirmed',{id,revision:r.revision});return r;
}
export function prioritizeContinuity(issues,{phase='writing'}={}){
 const groups={immediate:[],beforeApproval:[],batch:[]};
 for(const issue of issues){const priority=issue.priority||(issue.severity==='blocked'?'critical':issue.severity==='warning'?'important':'minor');const group=priority==='critical'?'immediate':priority==='important'?'beforeApproval':'batch';groups[group].push({...issue,priority});}
 return {...groups,visible:phase==='writing'?[...groups.immediate,...groups.beforeApproval]:[...groups.immediate,...groups.beforeApproval,...groups.batch],counts:{critical:groups.immediate.length,important:groups.beforeApproval.length,minor:groups.batch.length}};
}
