import {newProject,safeShots,previewShotsFromScript,invalidateApprovals,approveShot,exportApprovedSeedancePrompt,editShot,compileSeedancePrompt,extractShotsFromAI,validateImportedProject} from './core.mjs';
import {ensurePlanning,recordAuthorMessage,planningSignature,buildPlanningPrompt,applyPlanningResult,reviewIsCurrent,reviewIssue} from './planning.mjs';
import {listProjects,saveProject} from './storage.mjs';
import {inspectLocalDraft} from './local-review.mjs';
import {ensureNarrative,prioritizeContinuity,narrativePromptContext} from './narrative.mjs';
import {initNarrativeUI} from './narrative-ui.mjs';
import {ensureSeries,setWorkflow,editOutline,createEpisode,editEpisode,createSeriesRecord,decideSeriesRecord,proposeSeriesChange,resolveSeriesChange,linkShotEpisode,episodeState,inspectEpisode,seriesPromptContext} from './series.mjs';
import {projectToZip,projectFromZip} from './zip.mjs';
import {BridgeClient} from './bridge-client.mjs';
import {startProject,needsOnboarding,addImportedMaterials,removeImportedMaterial,importedPlanningContext,INTERVIEW_SEED} from './onboarding.mjs';
import {ensureGuards,addGuardRule,activeRules,staleRules,addShotClaim,removeShotClaim,inspectShot,attestShotReview,assertShotGuardReady,inspectProposal} from './guards.mjs';
import {ensureCanon,createCanonCandidate,decideCanonCandidate,reopenDeferredDecision,requestReconsideration,requestCanonChange,resolveCanonChange,calculateChangeImpact,addShotDependency,linkShotToCanon,createWhatIfBranch,addWhatIfIdea,proposeWhatIfToMain,buildDirectorPrompt,activeCanonContext,verifyCanonIntegrity,parseDecisionProposals} from './canon.mjs';
const $=id=>document.getElementById(id),bridge=new BridgeClient();
let projects=[],project=null,selected=null,saveTimer=null,busy=false,backupHandle=null,selectedBranch=null,selectedEpisodeNumber=null,writerScope='global',riskTimer=null,narrativeUI=null;
function notice(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>t.classList.remove('show'),4200);}
function setBusy(next){busy=next;for(const id of ['generateBtn','previewBtn','imageGenBtn','addShotBtn','approveBtn','extractDecisionBtn','candidateBtn','reviewPlanningBtn','recordPlanningBtn'])$(id).disabled=next;}
async function persist(p=project){if(!p)return;await saveProject(p);$('saveState').textContent='● 브라우저에 저장됨';}
function scheduleSave(){clearTimeout(saveTimer);$('saveState').textContent='저장 중…';const current=project;saveTimer=setTimeout(()=>{void persist(current).catch(e=>notice('저장 실패: '+e.message));},500);}
async function flush(){clearTimeout(saveTimer);await persist();}
function activeShot(){return project?.shots.find(s=>s.id===selected)||null;}
function activeEpisode(){return project?.series?.episodes.find(e=>e.number===selectedEpisodeNumber)||null;}
function renderShotTarget(){const el=$('shotGenerationScope');if(el)el.textContent=writerScope==='global'?'샷 생성 대상: 작품 전체 대본 (기획·AI 대화에서 집필 범위를 변경할 수 있습니다.)':`샷 생성 대상: ${writerScope}화 대본 (선택 회차 샷만 교체하며 다른 회차는 보존)`;}
function resetWriterScope(){writerScope='global';selectedEpisodeNumber=null;}
function projectList(){const box=$('projectList');box.replaceChildren();for(const p of projects){const btn=document.createElement('button');btn.className='project-item'+(p.id===project?.id?' active':'');btn.textContent=p.title||'제목 없음';const sub=document.createElement('span');sub.className='meta';sub.textContent=`${p.shots.length} shots · ${p.updatedAt?.slice(0,10)||''}`;btn.append(sub);btn.onclick=async()=>{if(p.id===project?.id)return;await flush();project=p;selected=p.shots[0]?.id||null;resetWriterScope();render();};box.append(btn);}}
function render(){if(!project)return;ensureCanon(project);ensureGuards(project);ensurePlanning(project);ensureSeries(project);ensureNarrative(project);projectList();$('projectHeading').textContent=project.title;$('titleInput').value=project.title;$('scriptInput').value=project.script;$('bibleInput').value=project.visualBible;$('scriptLength').textContent=`${project.script.length.toLocaleString()}자`;$('revisionCount').textContent=`Revision ${project.revision}`;renderReference();renderShots();renderDetail();renderCanon();renderSeries();renderWriter();renderShotTarget();renderEntry();}
function renderReference(){const area=$('referencePreview');area.replaceChildren();if(project.characterReference?.dataUrl){const img=document.createElement('img');img.src=project.characterReference.dataUrl;img.alt='캐릭터 참조 이미지';area.append(img);}}
function renderShots(){const list=$('shotList');list.replaceChildren();$('shotCount').textContent=project.shots.length;const approved=project.shots.filter(s=>s.status==='approved').length;$('approvalSummary').textContent=`승인 ${approved}개 / 검토 필요 ${project.shots.filter(s=>s.status==='needs_review').length}개`;$('revisionCount').textContent=`Revision ${project.revision}`;
 if(!project.shots.length){const p=document.createElement('p');p.className='empty';p.textContent='대본을 분석하거나 샷을 수동으로 추가하세요.';list.append(p);return;}
 for(const [idx,shot] of project.shots.entries()){const card=document.createElement('button');card.className='shot-card'+(selected===shot.id?' selected':'');const top=document.createElement('div');top.className='shot-card-top';const n=document.createElement('span');n.textContent=`SHOT ${String(idx+1).padStart(2,'0')} · ${shot.scene}`;const state=document.createElement('span');state.textContent=shot.status==='approved'?'승인':shot.status==='needs_review'?'재검토':'초안';top.append(n,state);const title=document.createElement('strong');title.textContent=shot.title;const summary=document.createElement('p');summary.textContent=shot.action.slice(0,110);const meta=document.createElement('small');meta.textContent=`${shot.episodeNumber?`${shot.episodeNumber}화 · `:''}${shot.duration}s · ${shot.camera||'카메라 미지정'} ${shot.storyboard?' · 이미지 등록됨':''}`;card.append(top,title,summary,meta);card.onclick=()=>{selected=shot.id;renderShots();renderDetail();};list.append(card);}}
const editSpecs=[['title','샷 제목','input'],['action','행동·연기','textarea'],['camera','카메라','input'],['location','장소','input'],['characters','등장인물','input'],['outfit','의상','input'],['props','소품','input'],['dialogue','대사','textarea'],['sound','음향','input'],['duration','길이(초)','number']];
function renderDetail(){const shot=activeShot();$('detailEmpty').classList.toggle('hidden',!!shot);$('detailForm').classList.toggle('hidden',!shot);if(!shot)return;$('shotState').textContent=shot.status==='approved'?'승인 완료':shot.status==='needs_review'?'재검토 필요':'초안';$('shotState').className='state-chip '+shot.status;
 const frame=$('storyboardBox');frame.replaceChildren();if(shot.storyboard?.dataUrl){const img=document.createElement('img');img.alt='샷 스토리보드';img.src=shot.storyboard.dataUrl;frame.append(img);}else{const placeholder=document.createElement('div');placeholder.className='storyboard-placeholder';placeholder.textContent='STORYBOARD · 16:9';frame.append(placeholder);}
 const area=$('editFields');area.replaceChildren();for(const [field,label,kind] of editSpecs){const wrap=document.createElement('div');wrap.className='detail-edit';const lab=document.createElement('label');lab.textContent=label;lab.htmlFor=`edit-${field}`;const control=document.createElement(kind==='textarea'?'textarea':'input');control.id=`edit-${field}`;if(kind!=='textarea')control.type=kind;control.value=shot[field]??'';control.onchange=()=>{editShot(project,shot.id,{[field]:control.value});scheduleSave();renderShots();$('shotState').textContent=shot.status==='approved'?'승인 완료':shot.status==='needs_review'?'재검토 필요':'초안';$('shotState').className='state-chip '+shot.status;};wrap.append(lab,control);area.append(wrap);}
 const selector=$('shotEpisodeSelect');selector.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='회차 미연결';selector.append(empty);for(const ep of project.series.episodes){const opt=document.createElement('option');opt.value=ep.number;opt.textContent=`${ep.number}화 · ${ep.title}`;selector.append(opt);}selector.value=shot.episodeNumber??'';
 $('seedancePrompt').value=shot.prompt||compileSeedancePrompt(shot,project.visualBible);$('videoInfo').textContent=shot.videoName?`연결한 파일: ${shot.videoName} (원본 영상 미저장)`:'영상은 로컬에 두고 파일 이름만 기록합니다.';renderShotGuard();
}
async function aiShots(){
 const ep=writerScope!=='global'?activeEpisode():null;
 const script=ep?ep.script:project.script;
 if(!script.trim())return notice('대본을 먼저 입력하세요.');
 if(!bridge.token)return $('connectDialog').showModal();
 const replaceCount=ep?project.shots.filter(s=>s.episodeNumber===ep.number).length:project.shots.length;
 if(replaceCount&&!confirm(`${ep?`${ep.number}화의`:'전체'} 기존 샷 ${replaceCount}개가 교체되고 이전 승인·이미지는 사라집니다. 계속할까요?`))return;
 setBusy(true);try{
  const prompt=buildDirectorPrompt({...project,script})+(ep?'\n'+seriesPromptContext(project,ep.number,{maxLength:8500}):'\n'+narrativePromptContext(project,{maxLength:6000}));
  if(prompt.length>30000)throw Error('샷 생성 지시가 너무 깁니다. 회차 대본을 분할하세요.');
  const result=await bridge.job('shots',prompt);const shots=extractShotsFromAI(result.text);
  for(const shot of shots){shot.episodeNumber=ep?.number??null;shot.prompt=compileSeedancePrompt(shot,project.visualBible);}
  project.history.push({at:new Date().toISOString(),event:'ai_shots_generated',count:shots.length,episodeNumber:ep?.number??null});
  project.shots=ep?[...project.shots.filter(s=>s.episodeNumber!==ep.number),...shots]:shots;
  selected=shots[0].id;project.revision++;project.updatedAt=new Date().toISOString();await flush();render();notice(`${shots.length}개 AI 샷 생성 완료. 승인 전 검토하세요.`);
 }catch(e){notice('AI 샷 생성 실패: '+e.message);}finally{setBusy(false);}
}
async function generateImage(){const shot=activeShot();if(!shot)return;if(!bridge.token)return $('connectDialog').showModal();setBusy(true);try{const prompt=`A single 16:9 cinematic storyboard frame. No text, no collage.\n${activeCanonContext(project,{maxLength:10000})}\n${narrativePromptContext(project,{maxLength:5000})}\n${shot.prompt||compileSeedancePrompt(shot,project.visualBible)}\nIMPORTANT: use visual reference for identity if provided.`;const result=await bridge.job('image',prompt,project.characterReference?.dataUrl?[project.characterReference.dataUrl]:[]);if(!result.image)throw new Error('이미지 결과 없음');shot.storyboard={mime:result.image.slice(5,result.image.indexOf(';')),dataUrl:result.image};if(shot.status==='approved'){shot.status='needs_review';shot.approvedFingerprint=null;}project.history.push({at:new Date().toISOString(),event:'storyboard_updated',shotId:shot.id});project.revision++;await flush();renderShots();renderDetail();notice('스토리보드 이미지가 등록됐습니다. 감독 승인 후 사용하세요.');}catch(e){notice('스토리보드 생성 실패: '+e.message);}finally{setBusy(false);}}
function renderShotGuard(){
 const reportArea=$('shotGuardReport'),claimList=$('guardClaimsList');if(!reportArea||!claimList)return;
 const shot=activeShot();claimList.replaceChildren();
 if(!shot){reportArea.textContent='검증할 샷을 선택하세요.';return;}
 const report=inspectShot(project,shot.id);
 reportArea.className='guard-report '+report.status;
 const label={blocked:'차단',unverified:'근거 부족',reviewed:'작가 근거 확인',verified:'검증 가능'}[report.status];
 const lines=[`검수: ${label} · 일치 ${report.matches.length} · 충돌 ${report.conflicts.length} · 미확인 ${report.unverified.length}`];
 for(const issue of report.conflicts)lines.push(`[차단] ${issue.message}`);
 for(const issue of report.unverified)lines.push(`[확인 필요] ${issue.message}`);
 if(report.humanReviewValid)lines.push(`작가 검토: ${shot.guardReview.reason}`);
 reportArea.textContent=lines.join('\n');
 for(const claim of shot.guardClaims||[]){
   const card=uiEl('div','guard-claim');card.append(uiEl('span','',`${claim.episode}화 · ${claim.kind} · ${claim.subject}/${claim.attribute} = ${claim.value}${claim.origin==='ai'?' (AI 추출·미확정)':''}`));
   card.append(uiButton('삭제',async()=>{removeShotClaim(project,shot.id,claim.id);await flush();renderShots();renderShotGuard();}));claimList.append(card);
 }
}
function renderGuardSettings(){
 const select=$('guardDecision'),list=$('guardRulesList');if(!select||!list)return;
 const old=select.value;select.replaceChildren();const option=uiEl('option','','승인 정설 선택');option.value='';select.append(option);
 for(const d of project.canon.decisions.filter(x=>x.status==='approved')){const op=uiEl('option','',d.title+` · v${d.version}`);op.value=d.id;select.append(op);}
 select.value=project.canon.decisions.some(d=>d.id===old&&d.status==='approved')?old:'';
 list.replaceChildren();const active=new Set(activeRules(project).map(x=>x.id));
 for(const rule of [...project.guards.rules].reverse()){
   const valid=active.has(rule.id);const item=infoItem(`${rule.kind} · ${rule.subject}/${rule.attribute} = ${rule.value}`,`${rule.startEpisode}~${rule.endEpisode}화 · 근거 정설 ${rule.decisionId.slice(-8)} v${rule.decisionVersion}`,valid?'승인 기준 유효':'정설 변경으로 검증 기준 만료 · 새 버전 기준을 등록해야 합니다.');
   list.append(item);
 }
 if(!project.guards.rules.length)list.append(uiEl('p','empty','등록된 검증 기준이 없습니다.'));
}
function asDataUrl(file,max=5_000_000){return new Promise((resolve,reject)=>{if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>max)return reject(new Error('PNG/JPEG/WebP 파일 5MB 이하만 지원합니다.'));const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});}
async function downloadBackup(){await flush();try{const bytes=projectToZip(project);const blob=new Blob([bytes],{type:'application/zip'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`DramaForge-${project.title.replace(/[^\w가-힣-]/g,'_')}-${new Date().toISOString().slice(0,10)}.zip`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notice('작품 ZIP 다운로드가 시작되었습니다. 완성 영상 원본은 포함하지 않습니다.');}catch(e){notice('백업 실패: '+e.message);}}
async function writeFolderBackup(silent=false){if(!backupHandle)return;if(typeof backupHandle.queryPermission==='function'){const status=await backupHandle.queryPermission({mode:'readwrite'});if(status!=='granted'){if(!silent)notice('폴더 쓰기 권한이 필요합니다.');return;}}const name=`DramaForge-${project.id}-${Date.now()}.zip`;const file=await backupHandle.getFileHandle(name,{create:true});const stream=await file.createWritable();await stream.write(projectToZip(project));await stream.close();if(!silent)notice(`백업 저장: ${name}`);}

// --- Author-controlled canon governance UI. The UI role is local single-author only. ---
function uiEl(tag,css='',content=''){const e=document.createElement(tag);if(css)e.className=css;if(content)e.textContent=content;return e;}
function uiButton(label,handler,primary=false){const button=uiEl('button',`btn small ${primary?'primary':'ghost'}`,label);button.type='button';button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{await handler();}catch(error){notice(error.message);}finally{button.disabled=false;}};return button;}
async function canonCommit(message){await flush();renderCanon();renderShots();renderDetail();notice(message);}
function showWorkspace(which){
 const ids={writer:'writerWorkspace',episode:'episodeWorkspace',production:'productionWorkspace',canon:'governanceWorkspace'};
 const tabs={writer:'writerTab',episode:'episodeTab',production:'productionTab',canon:'canonTab'};
 for(const key of Object.keys(ids)){
  const on=key===which;
  $(ids[key]).classList.toggle('hidden',!on);
  $(tabs[key]).className=on?'btn primary':'btn ghost';
  $(tabs[key]).setAttribute('aria-pressed',String(on));
 }
 if(which==='writer')renderWriter();
 if(which==='episode')renderSeries();
 if(which==='canon')renderCanon();
}
$('writerTab').onclick=()=>showWorkspace('writer');
$('episodeTab').onclick=()=>showWorkspace('episode');
$('openEpisodeBtn').onclick=()=>showWorkspace('episode');
$('productionTab').onclick=()=>showWorkspace('production');
$('canonTab').onclick=()=>showWorkspace('canon');
$('writerOpenCanonBtn').onclick=()=>showWorkspace('canon');
function renderWriter(){
 if(!project)return;ensurePlanning(project);
 const scope=$('writerScopeSelect');scope.replaceChildren();const globalOption=uiEl('option','','작품 전체 · 공통 대본');globalOption.value='global';scope.append(globalOption);for(const ep of project.series.episodes){const opt=uiEl('option','',`${ep.number}화 · ${ep.title}`);opt.value=String(ep.number);scope.append(opt);}if(writerScope!=='global'&&!project.series.episodes.some(e=>String(e.number)===writerScope))writerScope='global';scope.value=writerScope;
 const workingScript=writerScope==='global'?project.script:(project.series.episodes.find(e=>String(e.number)===writerScope)?.script||'');
 $('writerScriptInput').value=workingScript;
 $('writerScriptLength').textContent=`${workingScript.length.toLocaleString()}자`;
 renderLiveContinuity();renderLocalRisks();
 const messages=$('planningMessages');messages.replaceChildren();
 if(!project.planning.messages.length)messages.append(uiEl('p','empty','기획 메시지를 기록하면 대화와 검토 이력이 여기에 표시됩니다.'));
 for(const msg of project.planning.messages.slice(-55)){
  const el=uiEl('article',`planning-message ${msg.role==='assistant'?'assistant':''}`);
  el.append(uiEl('span','who',msg.role==='author'?'작가':'Codex · 검토 제안'));
  el.append(uiEl('div','',msg.content));messages.append(el);
 }
 messages.scrollTop=messages.scrollHeight;
 const canon=$('writerCanonList');canon.replaceChildren();
 const decisions=project.canon.decisions.filter(d=>d.status==='approved');
 if(!decisions.length)canon.append(uiEl('p','empty','승인 정설이 없습니다. 결정함에서 작가가 승인한 사실만 표시됩니다.'));
 for(const d of decisions.slice(-30).reverse()){
  const item=uiEl('article','writer-item');item.append(uiEl('strong','',`${d.title} · v${d.version}`),uiEl('div','',d.statement));canon.append(item);
 }
 const review=project.planning.reviews.at(-1),issues=$('planningIssueList');issues.replaceChildren();
 $('reviewStatus').textContent=!review?'AI 검토 전':reviewIsCurrent(project,review)?`현재 검토 · ${review.issues.length}건`:'오래된 검토 · 재실행 필요';
 if(!review){issues.append(uiEl('p','empty','AI 기획 검토를 실행하면 이전 기각·승인 결정과의 중복, 캐릭터·연표·복선 위험을 여기서 확인합니다.'));return;}
 if(!review.issues.length)issues.append(uiEl('p','empty','이번 분석에서 보고한 의심 항목이 없습니다. 모든 모순이 없다는 의미는 아닙니다.'));
 if(!reviewIsCurrent(project,review))issues.append(uiEl('p','help-text','대본·대화·정설이 변경되었습니다. 기존 검토 결과는 참고용이며 다시 검토해야 합니다.'));
 const kind={duplicate:'중복 기획',character:'캐릭터 설정',knowledge:'인물 지식',timeline:'사건 연표',foreshadowing:'복선·공개 시점',charter:'기획 방향',uncertain:'근거 부족'};
 const filter=$('aiIssueFilter').value;
 const visible=review.issues.filter(i=>filter==='all'||filter==='high'&&i.confidence==='high'||filter==='open'&&i.status==='needs_author_review');
 if(!visible.length && review.issues.length)issues.append(uiEl('p','empty','선택한 필터에 해당하는 검토 항목이 없습니다.'));
 for(const issue of visible){
  const current=reviewIsCurrent(project,review),resolved=issue.status!=='needs_author_review';
  const el=uiEl('article',`writer-item ${current?'suspect':'stale'} ${resolved?'resolved':''}`);
  el.append(uiEl('strong','',`${kind[issue.kind]||issue.kind} · ${resolved?'작가 처리됨':issue.confidence==='high'?'우선 검토':'검토 필요'}`));
  el.append(uiEl('div','',issue.explanation));
  if(issue.sourceQuote)el.append(uiEl('div','source',`원문: “${issue.sourceQuote}”`));
  if(issue.decisionId)el.append(uiEl('div','source',`관련 결정: ${issue.decisionId}`));
  if(!issue.verifiedReference)el.append(uiEl('span','small-note','출처 또는 결정 ID 미검증 — 인용을 직접 확인하세요.'));
  el.append(uiEl('div','',`수정 대안: ${issue.suggestion}`));
  if(issue.reviewNote)el.append(uiEl('div','source',`작가 검토: ${issue.reviewNote}`));
  const actions=uiEl('div','controls');
  actions.append(uiButton('수정 대안 복사',async()=>{await navigator.clipboard.writeText(issue.suggestion);notice('수정 대안을 복사했습니다. 정설·대본에 자동 적용하지 않습니다.');}));
  if(current&&!resolved){
   for(const [value,label] of [['acknowledged','검토 완료'],['dismissed','오탐 처리']]){
    actions.append(uiButton(label,async()=>{
     const note=window.prompt('검토 판단 근거 (8자 이상). 정설이나 대본은 변경되지 않습니다.');if(note===null)return;
     reviewIssue(project,review.id,issue.id,{resolution:value,note});await flush();renderWriter();
    }));
   }
  }
  el.append(actions);issues.append(el);
 }
 const skipped=review.skippedCandidates.length;
 if(skipped)issues.prepend(uiEl('p','help-text',`정설 후보 ${skipped}건은 중복 또는 기존 기각 기록과 충돌해 자동 등록하지 않았습니다. 결정함에서 기존 결정을 확인하세요.`));
}
function renderLocalRisks(){
 if(!project)return;const area=$('localRiskList');if(!area)return;
 area.replaceChildren();const script=writerScope==='global'?project.script:project.series.episodes.find(e=>String(e.number)===writerScope)?.script||'';
 const scan=inspectLocalDraft(project,{draftText:script,proposalText:$('planningInput').value,episodeNumber:writerScope==='global'?null:Number(writerScope),limit:30});
 $('localRiskCount').textContent=scan.total?`의심 ${scan.total}건`:'의심 0건';
 const visible=scan.issues.filter(x=>$('localRiskFilter').value==='all'||x.priority==='high');
 if(!visible.length)area.append(uiEl('p','empty',scan.total?'우선 검토 항목이 없습니다.':'등록된 기준에 대한 문자 기반 경고가 없습니다. 이것이 모순이 없다는 뜻은 아닙니다.'));
 for(const risk of visible){
   const card=uiEl('article',`writer-item ${risk.priority==='high'?'suspect':''}`);
   card.append(uiEl('strong','',risk.title+(risk.priority==='high'?' · 우선 검토':'')));
   card.append(uiEl('div','',risk.explanation));
   if(risk.sourceQuote)card.append(uiEl('div','source',`원문 근거: “${risk.sourceQuote}”`));
   if(risk.referenceId)card.append(uiEl('div','source',`승인 기록/결정: ${risk.referenceId}`));
   card.append(uiEl('div','',`검토 제안: ${risk.suggestion}`));
   card.append(uiEl('span','small-note','로컬 문구 비교에 따른 의심 사항 · 확정 판단 아님'));
   const controls=uiEl('div','controls');controls.append(uiButton('대안 복사',async()=>{await navigator.clipboard.writeText(risk.suggestion);notice('검토 대안을 복사했습니다. 원고에 자동 적용하지 않습니다.');}));card.append(controls);area.append(card);
 }
}
function scheduleLocalRisks(){clearTimeout(riskTimer);riskTimer=setTimeout(renderLocalRisks,200);}
$('localRiskFilter').onchange=renderLocalRisks;
$('aiIssueFilter').onchange=()=>{if(project)renderWriter();};
$('planningInput').addEventListener('input',scheduleLocalRisks);
async function recordPlanning(){
 try{recordAuthorMessage(project,$('planningInput').value);$('planningInput').value='';await flush();renderWriter();}
 catch(e){notice(e.message);}
}
async function aiPlanningReview(){
 if(!bridge.token){$('connectDialog').showModal();return;}
 setBusy(true);try{
  const input=$('planningInput').value.trim();if(input){recordAuthorMessage(project,input);$('planningInput').value='';await flush();}
  const signature=planningSignature(project);const prompt=buildPlanningPrompt(project,{episodeNumber:writerScope==='global'?null:Number(writerScope)});
  const result=await bridge.job('review',prompt);
  const review=applyPlanningResult(project,result.text,{expectedSignature:signature});
  await flush();renderWriter();renderCanon();
  notice(`AI 검토: 의심 사항 ${review.issues.length}건 · 후보 ${review.importedCandidateIds.length}건. 작가 승인이 필요합니다.`);
 }catch(e){notice('기획 검토 실패: '+e.message);renderWriter();}
 finally{setBusy(false);}
}
$('recordPlanningBtn').onclick=recordPlanning;
$('reviewPlanningBtn').onclick=aiPlanningReview;
function infoItem(title,text,additional=''){const card=uiEl('article','decision-item'),heading=uiEl('strong','',title),desc=uiEl('p','',text);card.append(heading,desc);if(additional)card.append(uiEl('p','muted',additional));return card;}
function renderCanon(){if(!project)return;ensureCanon(project);
 const approved=project.canon.decisions.filter(x=>x.status==='approved').length,rejected=project.canon.decisions.filter(x=>x.status==='rejected').length,candidates=project.canon.decisions.filter(x=>x.status==='candidate').length;
 $('canonSummary').textContent=`승인 정설 ${approved} · 후보 ${candidates} · 기각 ${rejected}`;
 const list=$('decisionList');list.replaceChildren();
 if(!project.canon.decisions.length)list.append(uiEl('p','empty','결정 후보를 등록하거나 Codex로 추출할 수 있습니다.'));
 for(const d of [...project.canon.decisions].reverse()){
  const states={candidate:'승인 대기',approved:'본편 정설',rejected:'기각됨',deferred:'보류'};
  const card=infoItem(`${d.title} · v${d.version}`,d.statement,`[${d.type}] ${states[d.status]||d.status} · ${d.id}`);
  if(d.rationale)card.append(uiEl('p','muted','결정 근거: '+d.rationale));
  if(d.status==='rejected'){card.append(uiEl('p','muted',`기각 사유: ${d.rejectionReason} · 재검토 조건: ${d.reconsiderWhen}`));}
  const actions=uiEl('div','controls');
  if(d.status==='candidate'){
    actions.append(uiButton('작가 승인',async()=>{await decideCanonCandidate(project,d.id,'approved',{expectedVersion:d.version});await canonCommit('정설 승인 완료. 다른 AI 요청에도 적용됩니다.');},true));
    actions.append(uiButton('기각',async()=>{const reason=window.prompt('기각 사유 (필수)');if(reason===null)return;const recheck=window.prompt('어떤 전제가 달라지면 다시 검토할까요? (필수)');if(recheck===null)return;await decideCanonCandidate(project,d.id,'rejected',{expectedVersion:d.version,reason,reconsiderWhen:recheck});await canonCommit('기각 사유와 재검토 조건을 저장했습니다.');}));
    actions.append(uiButton('보류',async()=>{const reason=window.prompt('보류 사유 (필수)');if(reason===null)return;await decideCanonCandidate(project,d.id,'deferred',{expectedVersion:d.version,reason});await canonCommit('결정이 보류되었습니다.');}));
  }else if(d.status==='approved'){
    actions.append(uiButton('변경 요청',async()=>{const statement=window.prompt('새로운 정설 내용 (원본은 승인 전까지 유지)',d.statement);if(statement===null)return;const reason=window.prompt('변경 사유 (필수)');if(reason===null)return;requestCanonChange(project,d.id,{statement,reason});await canonCommit('변경 요청을 등록했습니다. 기존 정설은 유지됩니다.');}));
    actions.append(uiButton('선택 샷에 연결',async()=>{if(!selected)throw Error('영상 제작 탭에서 연결할 샷을 먼저 선택하세요.');linkShotToCanon(project,selected,d.id);await canonCommit('선택 샷에 정설 참조를 연결했습니다.');}));
  }else if(d.status==='deferred'){
    actions.append(uiButton('검토 재개',async()=>{const reason=window.prompt('검토를 재개하는 이유 (필수)');if(reason===null)return;reopenDeferredDecision(project,d.id,{reason});await canonCommit('보류 결정을 후보로 되돌렸습니다. 다시 승인 또는 기각하세요.');}));
  }else if(d.status==='rejected'){
    actions.append(uiButton('전제 변경 재검토',async()=>{const changedPremise=window.prompt('기각 당시와 달라진 핵심 전제는 무엇인가요?');if(changedPremise===null)return;const evidence=window.prompt('실제로 전제가 변경되었다고 판단할 근거를 입력하세요.');if(evidence===null)return;requestReconsideration(project,d.id,{changedPremise,evidence});await canonCommit('조건부 재검토 후보가 등록됐습니다. 자동 승인은 하지 않습니다.');}));
  }
  if(actions.childElementCount)card.append(actions);list.append(card);
 }
 const changes=$('changeList');changes.replaceChildren();
 if(!project.canon.changes.length)changes.append(uiEl('p','empty','정설 변경 요청이 없습니다.'));
 for(const cr of [...project.canon.changes].reverse()){
   const impact=calculateChangeImpact(project,cr.targetId);
   const card=infoItem(`변경 요청 ${cr.id.slice(-8)} · ${cr.status==='pending'?'승인 대기':cr.status==='approved'?'승인됨':'반려'}`,`${cr.before.statement} → ${cr.after.statement}`,`사유: ${cr.reason} · 직접 참조 샷 ${impact.linkedShotIds.length}개 · 후속 의존 샷 ${impact.dependentShotIds.length}개 · 영향 미확인 샷 ${impact.unknownShotIds.length}개`);
   if(cr.status==='pending'){
     const actions=uiEl('div','controls');
     actions.append(uiButton('변경 승인',async()=>{if(!window.confirm(`직접 연결 ${impact.linkedShotIds.length}개, 후속 의존 ${impact.dependentShotIds.length}개, 영향 미확인 ${impact.unknownShotIds.length}개의 기존 승인을 무효화합니다. 진행할까요?`))return;await resolveCanonChange(project,cr.id,{approve:true});await canonCommit('정설 변경이 승인됐습니다. 영향을 받은 샷을 재검토하세요.');},true));
     actions.append(uiButton('반려',async()=>{await resolveCanonChange(project,cr.id,{approve:false});await canonCommit('변경 요청을 반려했습니다.');}));card.append(actions);
   }
   changes.append(card);
 }
 const choice=$('branchSelect');const prev=selectedBranch;choice.replaceChildren();const empty=uiEl('option','','실험 분기를 선택하세요');empty.value='';choice.append(empty);
 for(const branch of project.canon.branches){const option=uiEl('option','',`${branch.name} · 본편 r${branch.baseProjectRevision}`);option.value=branch.id;choice.append(option);}
 selectedBranch=project.canon.branches.some(x=>x.id===prev)?prev:(project.canon.branches.at(-1)?.id||'');choice.value=selectedBranch;
 renderBranchIdeas();
 renderGuardSettings();
}
function renderBranchIdeas(){const list=$('branchIdeaList');list.replaceChildren();const branch=project?.canon?.branches?.find(x=>x.id===selectedBranch);
 if(!branch){list.append(uiEl('p','empty','본편과 분리된 실험 분기를 먼저 만드세요.'));return;}
 list.append(uiEl('p','muted',`실험 가정: ${branch.premise} · 생성 당시 승인 정설 ${branch.canonSnapshot.length}개를 스냅샷으로 보존합니다.`));
 for(const idea of branch.ideas){const card=infoItem(idea.title,idea.statement,'분기 전용 · 본편 정설 아님');card.append(uiButton('본편 후보로 제안',async()=>{proposeWhatIfToMain(project,branch.id,idea.id);await canonCommit('본편에 승인 대기 후보를 추가했습니다. 정설 변경은 없습니다.');}));list.append(card);}
}
$('branchSelect').onchange=e=>{selectedBranch=e.target.value;renderBranchIdeas();};
$('guardKind').onchange=()=>{if($('guardKind').value==='timeline')$('guardEnd').value=$('guardStart').value;};
$('guardStart').onchange=()=>{if($('guardKind').value==='timeline')$('guardEnd').value=$('guardStart').value;};
$('addGuardRuleBtn').onclick=async()=>{try{
 const rule=addGuardRule(project,{decisionId:$('guardDecision').value,kind:$('guardKind').value,subject:$('guardSubject').value,attribute:$('guardAttribute').value,value:$('guardValue').value,startEpisode:$('guardStart').value,endEpisode:$('guardEnd').value});
 await canonCommit(`승인 정설에 연결된 검증 기준 ${rule.id.slice(-8)}을 등록했습니다.`);
 for(const id of ['guardSubject','guardAttribute','guardValue'])$(id).value='';
 }catch(e){notice(e.message);}};
$('addClaimBtn').onclick=async()=>{const shot=activeShot();if(!shot)return notice('샷을 먼저 선택하세요.');try{
 addShotClaim(project,shot.id,{kind:$('claimKind').value,subject:$('claimSubject').value,attribute:$('claimAttribute').value,value:$('claimValue').value,episode:$('claimEpisode').value});
 await flush();renderShots();renderDetail();for(const id of ['claimSubject','claimAttribute','claimValue'])$(id).value='';notice('검증 사실이 샷에 추가됐습니다.');
 }catch(e){notice(e.message);}};

$('candidateBtn').onclick=async()=>{try{const screening=inspectProposal(project,$('decisionStatement').value);if(screening.exactOrSimilar.some(x=>x.score>=0.72&&x.score<0.86)&&!window.confirm(`과거 결정 ${screening.exactOrSimilar.length}건과 문구가 유사합니다. 기존 기각·확정 기록을 확인하고 후보로 등록하시겠습니까?`))return;const candidate=createCanonCandidate(project,{type:$('decisionType').value,title:$('decisionTitle').value,statement:$('decisionStatement').value,rationale:$('decisionRationale').value});await canonCommit(`정설 후보 ${candidate.id.slice(-8)} 등록 완료. 승인 전에는 본편에 적용되지 않습니다.`);for(const id of ['decisionTitle','decisionStatement','decisionRationale'])$(id).value='';}catch(e){notice(e.message);}};
$('extractDecisionBtn').onclick=async()=>{if(!bridge.token){$('connectDialog').showModal();return;}setBusy(true);try{const context=activeCanonContext(project,{maxLength:9000});const prompt=`${context}
[대본 및 기획 기준에서 명시적으로 결정된 후보만 추출. 결론을 창작하지 말 것]
${project.script}
${project.visualBible}
[승인 전 참고 자료 — AI가 추출한 결정은 후보만 생성]
${importedPlanningContext(project,5000)}`;if(prompt.length>27000)throw Error('내용이 너무 깁니다. 일부 장면을 선택해 다시 시도하세요.');const result=await bridge.job('canon',prompt);const proposals=parseDecisionProposals(result.text);let count=0,skipped=0;for(const data of proposals){try{createCanonCandidate(project,data,{source:'ai'});count++;}catch{skipped++;}}await canonCommit(`AI 후보 ${count}개 등록, 중복/오류 ${skipped}개 보류. 작가 검토가 필요합니다.`);}catch(e){notice('정설 후보 추출 실패: '+e.message);}finally{setBusy(false);}};
$('createBranchBtn').onclick=async()=>{try{const branch=createWhatIfBranch(project,{name:$('branchName').value,premise:$('branchPremise').value});selectedBranch=branch.id;await canonCommit('실험 분기를 만들었습니다. 본편 정설은 변경되지 않았습니다.');$('branchName').value='';$('branchPremise').value='';}catch(e){notice(e.message);}};
$('addBranchIdeaBtn').onclick=async()=>{try{if(!selectedBranch)throw Error('실험 분기를 먼저 선택하세요.');addWhatIfIdea(project,selectedBranch,{title:$('branchIdeaTitle').value,statement:$('branchIdeaStatement').value});await canonCommit('실험안은 분기에만 저장했습니다.');$('branchIdeaTitle').value='';$('branchIdeaStatement').value='';}catch(e){notice(e.message);}};
// ---- v1.4.0 series ledger and automatic episode continuity panel ----
function renderLiveContinuity(){
 const area=$('liveContinuityList');area.replaceChildren();
 if(writerScope==='global'){$('liveContinuityStatus').textContent='작품 전체';area.append(uiEl('p','empty','회차를 선택하면 해당 회차의 승인된 사건·지식·복선과 원고를 자동 대조합니다.'));return;}
 let report;try{report=inspectEpisode(project,Number(writerScope));}catch(e){$('liveContinuityStatus').textContent='검사 불가';area.append(uiEl('p','empty',e.message));return;}
 const flagged=report.issues.filter(i=>i.severity==='blocked').length;
 const triage=prioritizeContinuity(report.issues,{phase:'writing'});
 $('liveContinuityStatus').textContent=flagged?`충돌 ${flagged}건`:triage.counts.important?`중요 검토 ${triage.counts.important}건`:triage.counts.minor?`경미한 메모 ${triage.counts.minor}건`:'확인된 자동 경고 없음';
 if(!report.issues.length)area.append(uiEl('p','empty','등록된 정설 범위에서 단순 자동 경고는 발견되지 않았습니다. 숨은 모순 부재를 보증하지 않습니다.'));
 for(const issue of triage.visible.slice(0,8)){
 const item=uiEl('article',`writer-item ${issue.severity==='blocked'?'suspect':''}`);
 item.append(uiEl('strong','',issue.severity==='blocked'?'즉시 확인 · 명시적 충돌':'승인 전 검토 제안'),uiEl('div','',issue.message));area.append(item);
 }
 if(triage.counts.minor)area.append(uiEl('p','help-text',`경미한 알림 ${triage.counts.minor}건은 회차 관리 화면의 일괄 확인에서 볼 수 있습니다.`));
}
function renderSeries(){
 if(!project)return;const s=ensureSeries(project);
 $('workflowSelect').value=s.workflow;$('seriesOutline').value=s.outline;
 const select=$('episodeSelector');select.replaceChildren();for(const ep of s.episodes){const option=uiEl('option','',`${ep.number}화 · ${ep.title}`);option.value=ep.number;select.append(option);}
 if(!s.episodes.some(e=>e.number===selectedEpisodeNumber))selectedEpisodeNumber=s.episodes[0]?.number??null;
 const ep=activeEpisode();select.value=ep?ep.number:'';
 for(const id of ['episodeTitle','episodeSummary','episodeScript'])$(id).disabled=!ep;
 $('episodeTitle').value=ep?.title||'';$('episodeSummary').value=ep?.summary||'';$('episodeScript').value=ep?.script||'';
 $('episodeSaveStatus').textContent=ep?`${ep.number}화 · Revision ${ep.revision} · 로컬 자동 저장`:'회차를 먼저 추가하세요.';
 $('eventEpisode').value=ep?.number||'';$('knowledgeEpisode').value=ep?.number||'';$('cluePlanted').value=ep?.number||'';
 renderRecordList();renderContinuityInspector();narrativeUI?.render();
}
function renderContinuityInspector(){
 const ep=activeEpisode(),issueList=$('episodeIssueList'),stateList=$('knowledgeStateList'),historyList=$('episodeHistoryList');
 for(const el of [issueList,stateList,historyList])el.replaceChildren();
 if(!ep){$('episodeInspectionStatus').textContent='검증할 회차를 선택하세요.';return;}
 const report=inspectEpisode(project,ep.number),state=episodeState(project,ep.number);
 $('episodeInspectionStatus').textContent=`${ep.number}화 로컬 자동 점검 · 충돌 ${report.issues.filter(i=>i.severity==='blocked').length} · 검토 필요 ${report.issues.filter(i=>i.severity!=='blocked').length}. AI 의미 검증 아님.`;
 if(!report.issues.length)issueList.append(uiEl('p','empty','명시적 규칙에서 발견된 경고 없음. 모든 문제가 없다는 뜻이 아닙니다.'));
 for(const issue of report.issues){const card=uiEl('article',`writer-item ${issue.severity}`);card.append(uiEl('strong','',`${issue.severity==='blocked'?'차단':issue.severity==='warning'?'검토 제안':'근거 미확인'} · ${issue.code}`),uiEl('div','',issue.message));if(issue.evidence)card.append(uiEl('div','source',`대조 항목: ${issue.evidence}`));issueList.append(card);}
 if(!state.knowledge.length)stateList.append(uiEl('p','empty','승인된 지식 기록이 없습니다.'));
 for(const k of state.knowledge){const card=uiEl('article','writer-item');card.append(uiEl('strong','',`${k.character} · ${k.characterKnows?'알고 있음':'아직 모름'}`),uiEl('div','',`${k.fact} (${k.kind==='belief'?'믿음':'사실'})`),uiEl('div','source',`인물 지식 ${k.learnedEpisode}화부터 · 관객 공개 ${k.audienceRevealEpisode??'미정'}`));stateList.append(card);}
 for(const event of state.events)historyList.append(uiEl('div','writer-item',`${event.episode}화 ${event.order}번째 사건 · ${event.title}`));
 for(const clue of state.clues)historyList.append(uiEl('div','writer-item',`복선 ${clue.isPlanted?'설치됨':'미설치'} · ${clue.clue} · 회수 ${clue.payoff??'미정'}화`));
 if(!historyList.children.length)historyList.append(uiEl('p','empty','이전 사건 및 승인된 복선이 없습니다.'));
}
function renderRecordList(){
 const list=$('seriesRecordList'),changes=$('seriesChangeList');list.replaceChildren();changes.replaceChildren();
 const records=[...project.series.records].reverse();if(!records.length)list.append(uiEl('p','empty','사건·지식·복선 후보를 등록하고 작가가 승인하세요.'));
 for(const r of records){
  const detail=r.type==='event'?`${r.episode}화 ${r.order}번째 · ${r.title}`:r.type==='knowledge'?`${r.character}: ${r.fact} · 획득 ${r.learnedEpisode}화 / 관객 ${r.audienceRevealEpisode??'미정'}`:`${r.clue} · 설치 ${r.plantedEpisode}화 / 회수 ${r.payoffEpisode??'미정'}`;
  const card=infoItem(`${r.type==='event'?'사건':r.type==='knowledge'?'인물 지식':'복선'} · ${r.status==='candidate'?'승인 대기':r.status==='approved'?'승인됨':'기각'}`,detail,`ID ${r.id} · r${r.revision}`),row=uiEl('div','controls');
  if(r.status==='candidate'){
   row.append(uiButton('작가 승인',async()=>{decideSeriesRecord(project,r.id,'approved',{expectedRevision:r.revision});await flush();renderSeries();renderShots();renderDetail();renderLiveContinuity();notice('회차 연속성 기록을 승인했습니다.');},true));
   row.append(uiButton('기각',async()=>{decideSeriesRecord(project,r.id,'rejected',{expectedRevision:r.revision});await flush();renderSeries();}));
  }
  if(r.status==='approved')row.append(uiButton('변경 요청',async()=>{
   const fields=r.type==='event'?['episode','order','title','description']:r.type==='knowledge'?['character','fact','learnedEpisode','audienceRevealEpisode','knowledgeKind']:['clue','plantedEpisode','payoffEpisode'];
   const original=Object.fromEntries(fields.map(k=>[k,r[k]]));const value=window.prompt('변경할 값만 JSON 객체로 작성하세요. 기존 승인본은 유지됩니다.',JSON.stringify(original,null,2));if(value===null)return;
   let changes;try{changes=JSON.parse(value);}catch{throw Error('유효한 JSON 객체가 아닙니다.');}
   if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('JSON 객체만 입력하세요.');
   proposeSeriesChange(project,r.id,changes);await flush();renderSeries();notice('변경 요청을 등록했습니다. 승인 이전에는 원본이 유지됩니다.');
  }));
  if(row.children.length)card.append(row);list.append(card);
 }
 for(const cr of [...project.series.changes].reverse()){
  const card=infoItem(`변경 요청 · ${cr.status==='pending'?'승인 대기':cr.status==='approved'?'승인됨':'반려'}`,JSON.stringify(cr.before)+' → '+JSON.stringify(cr.after));
  if(cr.status==='pending'){
   const row=uiEl('div','controls');row.append(uiButton('작가 변경 승인',async()=>{
    if(!confirm('관련 샷의 승인이 무효화됩니다. 변경을 확정할까요?'))return;
    resolveSeriesChange(project,cr.id,{approve:true});await flush();renderSeries();renderShots();renderDetail();renderLiveContinuity();notice('연속성 변경을 승인했습니다. 연결 샷을 재검토하세요.');
   },true));row.append(uiButton('반려',async()=>{resolveSeriesChange(project,cr.id,{approve:false});await flush();renderSeries();}));card.append(row);
  }changes.append(card);
 }
}
function updateEpisodeInput(field,value){
 if(!activeEpisode())return;
 const ep=editEpisode(project,selectedEpisodeNumber,{[field]:value});
 $('episodeSaveStatus').textContent=`${ep.number}화 · Revision ${ep.revision} · 저장 중…`;
 scheduleSave();renderContinuityInspector();renderLiveContinuity();narrativeUI?.render();renderShots();
 $('reviewStatus').textContent='회차 원고/개요 수정 · AI 재검토 필요';
}
$('workflowSelect').onchange=e=>{setWorkflow(project,e.target.value);scheduleSave();};
$('seriesOutline').oninput=e=>{editOutline(project,e.target.value);scheduleSave();renderShots();};
$('episodeSelector').onchange=e=>{selectedEpisodeNumber=Number(e.target.value);if(writerScope!=='global')writerScope=String(selectedEpisodeNumber);renderSeries();renderWriter();renderShotTarget();renderShotTarget();};
$('addEpisodeBtn').onclick=async()=>{try{
 const ep=createEpisode(project,{number:$('newEpisodeNumber').value,title:$('newEpisodeTitle').value});selectedEpisodeNumber=ep.number;
 $('newEpisodeNumber').value='';$('newEpisodeTitle').value='';await flush();renderSeries();renderWriter();notice(`${ep.number}화가 추가됐습니다.`);
 }catch(e){notice(e.message);}};
for(const [id,field] of [['episodeTitle','title'],['episodeSummary','summary'],['episodeScript','script']])$(id).oninput=e=>updateEpisodeInput(field,e.target.value);
$('seriesRecordType').onchange=e=>{for(const [kind,form] of [['event','eventRecordForm'],['knowledge','knowledgeRecordForm'],['foreshadowing','clueRecordForm']])$(form).classList.toggle('hidden',e.target.value!==kind);};
$('addSeriesRecordBtn').onclick=async()=>{try{
 const kind=$('seriesRecordType').value;
 const value=kind==='event'?{title:$('eventTitle').value,episode:$('eventEpisode').value,order:$('eventOrder').value,description:$('eventDescription').value}:kind==='knowledge'?{character:$('knowledgeCharacter').value,fact:$('knowledgeFact').value,learnedEpisode:$('knowledgeEpisode').value,audienceRevealEpisode:$('knowledgeReveal').value||null,knowledgeKind:$('knowledgeKind').value}:{clue:$('clueText').value,plantedEpisode:$('cluePlanted').value,payoffEpisode:$('cluePayoff').value||null};
 createSeriesRecord(project,kind,value);await flush();renderRecordList();notice('연속성 후보 등록 완료. 작가가 승인하기 전에는 검사 기준으로 사용되지 않습니다.');
 }catch(e){notice(e.message);}};
$('titleInput').oninput=e=>{project.title=e.target.value.slice(0,100);project.updatedAt=new Date().toISOString();$('projectHeading').textContent=project.title;projectList();scheduleSave();};
function updateScript(value,source){if(project.script===value)return;project.script=value;invalidateApprovals(project,'대본 수정');$('scriptInput').value=value;$('writerScriptInput').value=value;$('scriptLength').textContent=`${value.length.toLocaleString()}자`;$('writerScriptLength').textContent=`${value.length.toLocaleString()}자`;scheduleSave();renderShots();$('reviewStatus').textContent='대본 수정 · AI 재검토 필요';scheduleLocalRisks();}
$('scriptInput').oninput=e=>updateScript(e.target.value,'production');
$('writerScopeSelect').onchange=e=>{writerScope=e.target.value;if(writerScope!=='global')selectedEpisodeNumber=Number(writerScope);renderWriter();renderSeries();renderShotTarget();};
$('writerScriptInput').oninput=e=>{if(writerScope==='global')updateScript(e.target.value,'writer');else{const n=Number(writerScope);editEpisode(project,n,{script:e.target.value});$('writerScriptLength').textContent=`${e.target.value.length.toLocaleString()}자`;scheduleSave();renderShots();$('reviewStatus').textContent='회차 원고 수정 · AI 재검토 필요';renderLiveContinuity();narrativeUI?.render();scheduleLocalRisks();}};
$('bibleInput').oninput=e=>{if(project.visualBible!==e.target.value){project.visualBible=e.target.value;invalidateApprovals(project,'비주얼 바이블 수정');scheduleSave();renderShots();$('reviewStatus').textContent='기획 기준 변경 · AI 재검토 필요';}};
$('addShotDependencyBtn').onclick=async()=>{const shot=activeShot();if(!shot)return;const candidates=project.shots.filter(x=>x.id!==shot.id);if(!candidates.length)return notice('선행 샷이 없습니다.');const options=candidates.map((x,i)=>`${i+1}. ${x.scene} / ${x.title}`).join('\n');const value=window.prompt(`의존할 선행 샷 번호를 입력하세요.\n${options}`);if(value===null)return;const index=Number(value)-1;if(!Number.isInteger(index)||!candidates[index])return notice('올바른 번호를 입력하세요.');try{addShotDependency(project,shot.id,candidates[index].id);await flush();renderDetail();notice('선행 샷 의존성을 등록했습니다. 정설 변경 시 후속 샷까지 영향 범위를 추적합니다.');}catch(e){notice(e.message);}};
function showEntry(){if(!$('startDialog').open)$('startDialog').showModal();}
function renderEntry(){
 if(!project)return;
 const mode=project.onboarding?.mode;
 $('entryLabel').textContent=mode==='co-create'?'새 작품 · AI 공동 기획':mode==='import'?'기존 기획 · 참고 자료 기반':'작품 시작 방식 선택';
 const docs=project.importedMaterials||[];
 $('importSummary').textContent=docs.length?`참고 자료 ${docs.length}개 · 승인 정설과 분리 저장`:'AI와 새 기획을 시작하거나 기존 기획 자료를 가져올 수 있습니다.';
 $('materialStatus').textContent=docs.length?`가져온 참고 문서: ${docs.map(d=>d.name).join(', ').slice(0,280)}`:'기획서·캐릭터·전체 줄거리·대본을 함께 가져올 수 있습니다. 현재 TXT/MD/JSON 지원.';
 $('conversationMode').value=project.onboarding?.conversationStyle||'interview';
 const list=$('importedDocumentList');list.replaceChildren();for(const item of docs){
  const row=document.createElement('div');row.className='imported-document';
  const name=document.createElement('span');name.textContent=`${item.name} · 미승인 참고 문서`;
  const button=document.createElement('button');button.type='button';button.className='btn ghost small';button.textContent='제외';
  button.onclick=async()=>{if(!confirm(`참고 자료 ${item.name}을 프로젝트에서 제외하시겠습니까?`))return;removeImportedMaterial(project,item.id);await flush();renderEntry();};
  row.append(name,button);list.append(row);
 }
}
$('startModeBtn').onclick=showEntry;
$('closeStartDialogBtn').onclick=()=>$('startDialog').close();
$('coCreateBtn').onclick=async()=>{
 startProject(project,'co-create',{conversationStyle:$('conversationMode').value});
 await flush();renderEntry();$('startDialog').close();showWorkspace('writer');
 if(!$('planningInput').value.trim() && project.planning.messages.length===0)$('planningInput').value=INTERVIEW_SEED+'\n아이디어: ';
 $('planningInput').focus();notice('공동 기획을 시작합니다. 아이디어를 입력한 후 AI 기획 검토를 실행하세요.');
};
$('importModeBtn').onclick=async()=>{
 startProject(project,'import',{conversationStyle:$('conversationMode').value});
 await flush();renderEntry();$('planningFiles').click();
};
$('planningFiles').onchange=async e=>{
 const files=[...(e.target.files||[])];if(!files.length)return;
 try{
  if(files.some(f=>f.size>350_000))throw Error('파일당 최대 350KB의 텍스트만 가져올 수 있습니다.');
  const documents=await Promise.all(files.map(async f=>({name:f.name,content:await f.text()})));
  addImportedMaterials(project,documents);startProject(project,'import',{conversationStyle:$('conversationMode').value});
  await flush();renderEntry();$('startDialog').close();showWorkspace('writer');
  notice(`참고 문서 ${files.length}개 추가 완료. 승인 정설은 변경되지 않았습니다.`);
 }catch(err){$('materialStatus').textContent='가져오기 실패: '+err.message;}finally{e.target.value='';}
};
$('newProjectBtn').onclick=async()=>{await flush();const p=newProject(`새 작품 ${projects.length+1}`);p.onboarding={status:'pending'};projects.unshift(p);project=p;selected=null;resetWriterScope();await persist();render();showWorkspace('writer');showEntry();};
$('addShotBtn').onclick=async()=>{const shot=safeShots([{scene:`SC${String(project.shots.length+1).padStart(2,'0')}`,title:`샷 ${project.shots.length+1}`,action:'장면의 행동을 입력하세요.',camera:'Medium shot',duration:8}])[0];shot.prompt=compileSeedancePrompt(shot,project.visualBible);project.shots.push(shot);selected=shot.id;project.revision++;await flush();render();};
$('previewBtn').onclick=async()=>{try{
 const ep=writerScope!=='global'?activeEpisode():null,script=ep?ep.script:project.script;
 const count=ep?project.shots.filter(s=>s.episodeNumber===ep.number).length:project.shots.length;
 if(count&&!confirm(`${ep?`${ep.number}화`:'전체'} 기존 샷 ${count}개를 교체합니다. 계속할까요?`))return;
 const shots=previewShotsFromScript(script);for(const shot of shots){shot.episodeNumber=ep?.number??null;shot.prompt=compileSeedancePrompt(shot,project.visualBible);}
 project.shots=ep?[...project.shots.filter(s=>s.episodeNumber!==ep.number),...shots]:shots;selected=shots[0].id;
 project.revision++;project.history.push({at:new Date().toISOString(),event:'local_preview',count:shots.length,episodeNumber:ep?.number??null});await flush();render();notice('로컬 규칙 기반 샷 초안입니다. AI 분석 결과가 아닙니다.');
 }catch(e){notice(e.message);}};
$('shotEpisodeSelect').onchange=async e=>{const shot=activeShot();if(!shot)return;try{if(!e.target.value){notice('기존 회차 연결 해제는 별도 변경 관리에서 진행해야 합니다.');renderDetail();return;}linkShotEpisode(project,shot.id,Number(e.target.value));await flush();renderShots();renderDetail();notice('회차 연결됨. 샷 승인 상태를 확인하세요.');}catch(err){notice(err.message);renderDetail();}};
$('generateBtn').onclick=aiShots;$('imageGenBtn').onclick=generateImage;
$('referenceFile').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;const dataUrl=await asDataUrl(file);project.characterReference={name:file.name,dataUrl,mime:file.type};invalidateApprovals(project,'캐릭터 참조 이미지 수정');await flush();renderReference();renderShots();notice('캐릭터 참조 이미지 저장됨');}catch(err){notice(err.message);}finally{e.target.value='';}};
$('storyboardFile').onchange=async e=>{const shot=activeShot();if(!shot)return;try{const file=e.target.files?.[0];if(!file)return;shot.storyboard={mime:file.type,dataUrl:await asDataUrl(file)};if(shot.status==='approved'){shot.status='needs_review';shot.approvedFingerprint=null;}project.history.push({at:new Date().toISOString(),event:'storyboard_updated',shotId:shot.id});project.revision++;await flush();renderShots();renderDetail();notice('스토리보드 등록 완료');}catch(err){notice(err.message);}finally{e.target.value='';}};
$('seedancePrompt').onchange=e=>{const shot=activeShot();if(!shot)return;editShot(project,shot.id,{prompt:e.target.value});scheduleSave();renderShots();};
$('promptBtn').onclick=async()=>{const shot=activeShot();if(!shot)return;editShot(project,shot.id,{prompt:compileSeedancePrompt(shot,project.visualBible)});await flush();renderDetail();renderShots();notice('현재 샷 정보를 바탕으로 Seedance용 설명형 프롬프트를 구성했습니다.');};
$('copyBtn').onclick=async()=>{try{const shot=activeShot();if(!shot||shot.status!=='approved')throw new Error('샷 승인 후 최종 프롬프트를 복사할 수 있습니다.');const approvedPrompt=exportApprovedSeedancePrompt(project,shot.id);if($('seedancePrompt').value!==approvedPrompt)throw new Error('수정된 프롬프트는 재승인 후 복사할 수 있습니다.');await navigator.clipboard.writeText(approvedPrompt);notice('프롬프트 복사 완료');}catch(e){notice('복사 실패: '+e.message);}};
$('approveBtn').onclick=async()=>{const shot=activeShot();if(!shot)return;try{
 editShot(project,shot.id,{prompt:$('seedancePrompt').value});let guard=inspectShot(project,shot.id);
 if(guard.status==='blocked')throw new Error('확정된 정설과 충돌하거나 정설 참조가 없습니다. 정설 연결·샷 내용을 먼저 수정하세요.');
 if(guard.status==='unverified'){
   const reason=window.prompt('검증되지 않은 설정을 직접 확인한 근거를 12자 이상 작성하세요. 자동 검증 완료로 표시하지 않습니다.');
   if(reason===null)return;
   attestShotReview(project,shot.id,{reason});
 }
 assertShotGuardReady(project,shot.id);approveShot(project,shot.id);
 await flush();renderShots();renderDetail();await writeFolderBackup(true).catch(()=>{});notice('정설 검토를 거쳐 샷을 승인했습니다.');
 }catch(e){notice('승인 실패: '+e.message);}};
$('videoFile').onchange=async e=>{const file=e.target.files?.[0],shot=activeShot();if(!shot||!file)return;editShot(project,shot.id,{videoName:file.name});await flush();renderDetail();renderShots();notice('파일명만 저장했습니다. 실제 영상 파일은 별도로 백업하세요.');e.target.value='';};
$('backupBtn').onclick=downloadBackup;
$('folderBtn').onclick=async()=>{if(!window.showDirectoryPicker)return notice('이 브라우저는 폴더 저장을 지원하지 않습니다. ZIP 백업을 이용하세요.');try{backupHandle=await window.showDirectoryPicker({mode:'readwrite'});await writeFolderBackup(false);}catch(e){if(e.name!=='AbortError')notice('폴더 백업 실패: '+e.message);}};
$('importFile').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>120_000_000)throw new Error('백업 파일이 너무 큽니다.');const p=validateImportedProject(projectFromZip(await file.arrayBuffer()));await verifyCanonIntegrity(p);ensureGuards(p);if(projects.some(q=>q.id===p.id)){if(!confirm('동일한 작품이 이미 있습니다. 새 복사본으로 가져올까요?'))return;p.id=crypto.randomUUID();p.title+=' (복원)';}await flush();projects.unshift(p);project=p;selected=p.shots[0]?.id||null;resetWriterScope();await persist();render();notice('프로젝트 ZIP 복원 완료');}catch(err){notice('복원 실패: '+err.message);}finally{e.target.value='';}};
let installPoll=null;
const WINDOWS_SETUP='/downloads/DramaForge-Setup-Windows.exe';
function installFileForPlatform(){
 const platform=String(navigator.userAgentData?.platform||navigator.platform||navigator.userAgent||'').toLowerCase();
 return /win/.test(platform)?WINDOWS_SETUP:null; // Other OS installers are not yet native-tested.
}
async function prewarmNativeActivation(){
 const button=$('autoConnectBtn');button.disabled=true;
 try{await bridge.prepareActivation(window.location.origin);}catch(error){$('connectionStatus').textContent=error.message;}
 finally{button.disabled=false;}
}
function connectionErrorMessage(error){
 const message=String(error?.message||error||'연결 오류');
 if(message.includes('로컬 연결 앱이 실행되지'))return 'PC 연결 앱이 실행되지 않았거나 브라우저의 로컬 네트워크 권한이 차단되었습니다. Windows 설치 앱이 등록되었는지 확인하세요.';
 return message;
}
function setDisconnected(message){
 bridge.token=null;
 $('connectBtn').textContent='◉ AI 연결';
 $('firstInstallHelp').hidden=false;
 $('connectionStatus').textContent=message;
 $('loginBtn').title='PC 연결을 승인한 다음 ChatGPT 로그인할 수 있습니다.';
}
async function renderConnectedStatus(){
 const status=await bridge.status();
 $('firstInstallHelp').hidden=true;
 $('connectBtn').textContent=status.account?'◉ AI 연결됨':'◉ 브리지 연결';
 $('connectionStatus').textContent=status.account?`브리지 연결됨 · ChatGPT 로그인됨 (플랜 ${status.account.plan||'미확인'})`:
   `브리지 연결됨 · Codex ${status.installed?'실행 확인':'실행 오류'} · ${status.error||'ChatGPT 로그인 필요'}`;
 return status;
}
function stopInstallWatch(){if(installPoll!==null){clearInterval(installPoll);installPoll=null;}}
function watchInstallation(){
 stopInstallWatch();let checks=0,inFlight=false;
 installPoll=setInterval(async()=>{
  if(inFlight)return;inFlight=true;
  try{
   if(++checks>75){stopInstallWatch();$('installProgress').textContent='설치 여부를 확인하지 못했습니다. PC에서 설치 완료 메시지를 확인하세요.';return;}
   const status=await bridge.presence();
   if(status.app==='DramaForge'){
    stopInstallWatch();$('installProgress').textContent='PC 연결 프로그램 실행이 확인되었습니다. 이제 「PC 연결 앱 열기」로 연결을 승인하세요.';
    await prewarmNativeActivation();
   }
  }catch{}finally{inFlight=false;}
 },2000);
}
$('installConnectorBtn').onclick=async()=>{
 const url=installFileForPlatform();
 if(!url){$('installProgress').textContent='현재 자동 실행 연결은 Windows 네이티브 설치만 지원합니다. macOS/Linux 연결은 추후 검증 후 제공합니다.';return;}
 try{
  const response=await fetch(url,{method:'HEAD',cache:'no-store'});
  if(!response.ok||!response.headers.get('content-type')?.match(/application|octet-stream|binary/i))throw new Error('네이티브 설치 파일이 아직 배포되지 않았습니다. Windows 빌드 산출물을 올려야 합니다.');
  const a=document.createElement('a');a.href=url;a.download='DramaForge-Setup-Windows.exe';document.body.append(a);a.click();a.remove();
  $('installProgress').textContent='설치 EXE를 한 번 실행하고 Windows 보안 안내를 확인하세요. 설치가 끝나면 PC 연결을 승인할 수 있습니다.';
  watchInstallation();
 }catch(e){$('installProgress').textContent=e.message;}
};
async function startNativeConnection(){
 $('connectionStatus').textContent='PC 연결 앱을 열도록 요청합니다. 운영체제의 앱 열기 창을 허용하세요.';
 try{
  await bridge.activate({origin:window.location.origin,onProgress:(message)=>{$('connectionStatus').textContent=message;}});
  await renderConnectedStatus();stopInstallWatch();notice('DramaForge PC 연결이 승인되었습니다.');return true;
 }catch(e){setDisconnected(connectionErrorMessage(e));return false;}
}
async function autoConnect({silent=false}={}){
 try{
  if(!bridge.token){if(silent){setDisconnected('PC 연결 승인이 필요합니다.');return false;}return startNativeConnection();}
  await bridge.reconnect();await renderConnectedStatus();stopInstallWatch();return true;
 }catch(e){if(silent){setDisconnected('PC 연결 승인이 필요합니다.');return false;}return startNativeConnection();}
}
$('connectBtn').onclick=async()=>{$('connectDialog').showModal();void prewarmNativeActivation();if(bridge.token)await autoConnect({silent:true});};
$('autoConnectBtn').onclick=()=>startNativeConnection();
async function checkStatus(){
 try{if(!bridge.token)throw new Error('먼저 PC 연결 앱을 열고 승인하세요.');await renderConnectedStatus();}
 catch(e){setDisconnected(connectionErrorMessage(e));}
}
$('statusBtn').onclick=checkStatus;
$('bridgeHealthBtn').onclick=()=>{
 const tab=window.open('http://127.0.0.1:7331/health','_blank','noopener,noreferrer');
 if(!tab)$('connectionStatus').textContent='진단 페이지가 차단되었습니다. http://127.0.0.1:7331/health 를 주소창에 직접 입력하세요.';
};
$('bridgeRepairBtn').hidden=true; // Old .cmd recovery is not a native v1.8.0 upgrade path.
$('loginBtn').onclick=async()=>{
 // A blank tab must be opened synchronously before waiting for the local bridge,
 // otherwise browser popup blockers may prevent the official authentication page.
 const tab=window.open('about:blank','_blank');
 $('connectionStatus').textContent='연결 프로그램과 Codex 로그인 상태를 확인하는 중…';
 try{
  if(!bridge.token){tab?.close();$('connectionStatus').textContent='먼저 「PC 연결 앱 열기」를 눌러 Windows에서 연결 요청을 승인해 주세요.';void prewarmNativeActivation();return;}
  const result=await bridge.login();
  $('connectBtn').textContent='◉ 브리지 연결';$('firstInstallHelp').hidden=true;
  if(result.authUrl){
   if(!tab){$('connectionStatus').textContent='로그인 창이 차단되었습니다. 팝업 허용 후 다시 시도하세요.';return;}
   tab.location.href=result.authUrl;
   $('connectionStatus').textContent='ChatGPT 공식 로그인 창이 열렸습니다. 인증 완료 후 상태 확인을 누르세요.';
  }else{tab?.close();await renderConnectedStatus();}
 }catch(e){tab?.close();setDisconnected(connectionErrorMessage(e));}
};
narrativeUI=initNarrativeUI({getProject:()=>project,getEpisode:()=>selectedEpisodeNumber,persist:flush,afterChange:()=>{renderSeries();renderShots();renderDetail();renderLiveContinuity();},notice});
try{projects=await listProjects();if(!projects.length){const p=newProject('첫 번째 드라마');p.onboarding={status:'pending'};projects=[p];await persist(p);}project=projects[0];selected=project.shots[0]?.id||null;resetWriterScope();render();$('saveState').textContent='● 브라우저에 저장됨';if(needsOnboarding(project))showEntry();void autoConnect({silent:true});}catch(e){notice('IndexedDB 초기화 실패: '+e.message);$('saveState').textContent='저장 기능 오류';}
