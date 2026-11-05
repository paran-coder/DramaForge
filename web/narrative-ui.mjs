/** Native DOM controller for author-gated Narrative Memory, not an AI tool. */
import {ensureNarrative,createNarrativeCandidate,decideNarrativeCandidate,proposeNarrativeChange,resolveNarrativeChange,refreshNarrativeDependencies,acknowledgeNarrativeIssues,narrativeReviewCurrent,inspectNarrative,narrativeState,prioritizeContinuity} from './narrative.mjs';

const $=id=>document.getElementById(id);
const el=(tag,className='',value='')=>{const e=document.createElement(tag);if(className)e.className=className;if(value)e.textContent=value;return e;};
const field=id=>$(id).value;
const optional=id=>field(id).trim()===''?null:Number(field(id));
function btn(label,task,primary=false){const b=el('button',`btn small ${primary?'primary':'ghost'}`,label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await task();}finally{b.disabled=false;}});return b;}
function addRow(parent,label,value){const row=el('div','narrative-timeline');row.append(el('span','narrative-caption',label),el('strong','',String(value??'미정')));parent.append(row);}
export function initNarrativeUI({getProject,getEpisode,persist,afterChange,notice}){
 const action=async(task,message)=>{try{await task();await persist();afterChange();notice(message);}catch(e){notice(`서사 기억: ${e.message}`);}};
 function eventOptions(id,records){const sel=$(id),selected=sel.value;sel.replaceChildren();if(!records.length){const opt=el('option','','승인된 사건이 없습니다');opt.value='';sel.append(opt);return;}for(const rec of records){const opt=el('option','',`${rec.episode}화 · ${rec.title}`);opt.value=rec.id;sel.append(opt);}if(records.some(r=>r.id===selected))sel.value=selected;}
 function updateForms(){const type=field('narrativeType');for(const [kind,id] of [['causality','causalityForm'],['perspective','perspectiveForm'],['timeline','timelineForm']])$(id).classList.toggle('hidden',type!==kind);}
 function getForm(){const type=field('narrativeType'),sourceQuote=field('narrativeSourceQuote');
  if(type==='causality')return {type,data:{causeEventId:field('causeEvent'),effectEventId:field('effectEvent'),prerequisite:field('causalPrerequisite'),reason:field('causalReason'),exception:field('causalException'),sourceQuote}};
  if(type==='timeline')return {type,data:{eventId:field('timelineEvent'),worldOrder:field('worldOrder'),worldTime:field('worldTime'),audienceEpisode:field('audienceEventEpisode'),audienceScene:field('audienceEventScene'),sourceQuote}};
  return {type,data:{worldTruth:field('worldTruth'),character:field('perspectiveCharacter'),characterBelief:field('characterBelief'),characterLearnEpisode:optional('characterBeliefEpisode'),audienceBelief:field('audienceBelief'),audienceMisleadEpisode:optional('audienceMisleadEpisode'),truthRevealEpisode:optional('truthRevealEpisode'),intentionalMisdirection:$('intentionalMisdirection').checked,directorIntent:field('directorIntent'),sourceQuote}};
 }
 const description=r=>r.type==='causality'?`원인 ${r.causeEventId} → 결과 ${r.effectEventId}\n선행 조건 ${r.prerequisite}\n근거 ${r.reason}${r.exception?'\n예외 '+r.exception:''}`:r.type==='timeline'?`사건 ${r.eventId}\n극중 ${r.worldOrder}번째 · ${r.worldTime||'시점 미정'}\n관객 공개 ${r.audienceEpisode}화 ${r.audienceScene||''}`:`진실 ${r.worldTruth}\n${r.character||'인물 미지정'}의 믿음 ${r.characterBelief||'미기록'}\n관객의 믿음 ${r.audienceBelief||'미기록'}\n공개 ${r.truthRevealEpisode??'미정'}화`;
 function renderRecords(p){const list=$('narrativeRecordList'),changes=$('narrativeChangeList');list.replaceChildren();changes.replaceChildren();
  const records=[...p.narrative.records].reverse();if(!records.length)list.append(el('p','empty','인과관계·정보 상태·시간축 기록이 없습니다.'));
  for(const r of records){const card=el('article','decision-item'),heading=el('strong','',`${r.type==='causality'?'인과관계':r.type==='timeline'?'시간축':'정보 상태'} · ${r.status==='approved'?'승인':r.status==='candidate'?'작가 승인 대기':'기각'} · r${r.revision}`),body=el('p','',description(r));card.append(heading,body,el('p','muted',`ID ${r.id}`));if(r.sourceQuote)card.append(el('p','source',`근거: ${r.sourceQuote}`));const controls=el('div','controls');
   if(r.status==='candidate'){
    controls.append(btn('작가 승인',()=>action(()=>decideNarrativeCandidate(p,r.id,'approved',{expectedRevision:r.revision}),'서사 기억을 승인했습니다.'),true));
    controls.append(btn('기각',()=>action(()=>decideNarrativeCandidate(p,r.id,'rejected',{expectedRevision:r.revision}),'후보를 기각하고 이력을 보존했습니다.')));
   }
   if(r.status==='approved'){
    controls.append(btn('변경 요청',async()=>{const latest=r.versions.at(-1).data;const json=window.prompt('변경한 필드만 JSON으로 입력하세요. 기존 정설은 승인 전까지 유지됩니다.',JSON.stringify(latest,null,2));if(json===null)return;let patch;try{patch=JSON.parse(json);}catch{notice('유효한 JSON 객체가 필요합니다.');return;}if(!patch||typeof patch!=='object'||Array.isArray(patch)){notice('JSON 객체만 허용됩니다.');return;}await action(()=>proposeNarrativeChange(p,r.id,patch),'변경 요청을 등록했습니다.');}));
    if((r.type==='causality'||r.type==='timeline')&&Object.entries(r.versions.at(-1)?.eventRevisions||{}).some(([id,rev])=>p.series.records.find(x=>x.id===id&&x.status==='approved'&&x.revision===rev)===undefined))controls.append(btn('변경 사건 재확인',()=>action(()=>refreshNarrativeDependencies(p,r.id),'변경된 사건의 연결을 재확인했습니다.')));
   }
   if(controls.children.length)card.append(controls);list.append(card);
  }
  for(const cr of [...p.narrative.changes].reverse()){
   const card=el('article','decision-item');card.append(el('strong','',`변경 요청 · ${cr.status}`),el('p','',`기존: ${JSON.stringify(cr.before)}\n제안: ${JSON.stringify(cr.after)}`));
   if(cr.status==='pending'){
    const controls=el('div','controls');controls.append(btn('작가 변경 승인',()=>action(()=>resolveNarrativeChange(p,cr.id,{approve:true}),'변경을 승인했습니다. 영향받는 샷을 재검토하세요.'),true));
    controls.append(btn('반려',()=>action(()=>resolveNarrativeChange(p,cr.id,{approve:false}),'변경을 반려했습니다.')));card.append(controls);
   }changes.append(card);
  }
 }
 function renderState(p){const n=getEpisode(),states=$('narrativeStateList'),critical=$('narrativeCriticalList'),batch=$('narrativeBatchList'),times=$('narrativeTimeList');
  for(const x of [states,critical,batch,times])x.replaceChildren();
  if(n===null||n===undefined||!p.series.episodes.some(e=>e.number===n)){$('narrativeReviewStatus').textContent='먼저 회차를 선택하세요.';$('narrativeReviewBtn').disabled=true;$('narrativeBatchCount').textContent='0';return;}
  const state=narrativeState(p,n),report=inspectNarrative(p,n),triage=prioritizeContinuity(report.issues,{phase:'approval'});
  const reviewed=narrativeReviewCurrent(p,n);$('narrativeReviewStatus').textContent=`${n}화 · 치명 ${triage.counts.critical}, 중요 ${triage.counts.important}, 경미 ${triage.counts.minor} · 중요 경고 작가 검토 ${reviewed?'완료':'필요 시 대기'}`;
  if(!state.perspectives.length)states.append(el('p','empty','승인된 인물·관객의 믿음 기록이 없습니다.'));
  for(const perspective of state.perspectives){const box=el('article','writer-item');box.append(el('strong','',`${perspective.character||'관객 중심'} · ${perspective.audienceState==='truth_revealed'?'진실 공개':perspective.audienceState==='believes'?'관객은 오해 중':'관객에게 미공개'}`));
   addRow(box,'세계관의 진실',perspective.worldTruth);addRow(box,'인물의 믿음',`${perspective.characterBelief||'기록 없음'} / ${perspective.characterState==='believes'?'알고/믿고 있음':'미정 또는 이전 시점'}`);addRow(box,'관객의 믿음',`${perspective.audienceBelief||'없음'} / ${perspective.audienceState}`);if(perspective.intentionalMisdirection)box.append(el('p','source','의도된 반전 · 작가 승인 기록'));states.append(box);}
  const show=(list,issue)=>{const box=el('article',`writer-item ${issue.severity}`);box.append(el('strong','',`${issue.priority==='critical'?'즉시 수정':issue.priority==='important'?'승인 전 검토':'정리 시 검토'} · ${issue.code}`),el('div','',issue.message));if(issue.referenceId)box.append(el('p','source',`정설 ID ${issue.referenceId}`));list.append(box);};
  const high=[...triage.immediate,...triage.beforeApproval];if(!high.length)critical.append(el('p','empty','치명적 충돌이나 중요 경고가 없습니다.'));
  for(const issue of high)show(critical,issue);
  for(const issue of triage.batch)show(batch,issue);
  $('narrativeBatchCount').textContent=String(triage.counts.minor);
  $('narrativeReviewBtn').disabled=!!triage.counts.critical||!triage.counts.important||reviewed;
  if(!state.chronology.length)times.append(el('p','empty','극중 시점·공개 회차가 승인된 사건이 없습니다.'));
  for(const record of state.chronology){const box=el('article','writer-item');box.append(el('strong','',`사건 ${record.eventId}`));addRow(box,'극중 실제 시간',`#${record.worldOrder} · ${record.worldTime||'텍스트 미정'}`);addRow(box,'시청자 공개',`${record.audienceEpisode}화 ${record.audienceScene}`);addRow(box,'기획·승인 시간',`${record.approvedAt||'미정'} · r${record.revision}`);times.append(box);}
  for(const rel of state.causal){const box=el('article','writer-item');box.append(el('strong','',`원인 ${rel.causeEventId} → 결과 ${rel.effectEventId}`),el('div','',`${rel.prerequisite} · ${rel.reason}`));if(rel.stale)box.append(el('p','source','선행 사건 수정으로 재검토 필요'));times.append(box);}
 }
 function render(){const p=getProject();if(!p)return;ensureNarrative(p);const events=p.series.records.filter(r=>r.type==='event'&&r.status==='approved');for(const id of ['causeEvent','effectEvent','timelineEvent'])eventOptions(id,events);updateForms();renderRecords(p);renderState(p);}
 $('narrativeType').addEventListener('change',updateForms);
 $('addNarrativeBtn').addEventListener('click',()=>action(()=>{const p=getProject(),{type,data}=getForm();createNarrativeCandidate(p,type,data);},'서사 기록 후보를 등록했습니다. 승인 전에는 정설이 아닙니다.'));
 $('narrativeReviewBtn').addEventListener('click',()=>action(()=>acknowledgeNarrativeIssues(getProject(),getEpisode(),field('narrativeReviewReason')),'중요 경고 검토 근거를 저장했습니다.'));
 return {render};
}
