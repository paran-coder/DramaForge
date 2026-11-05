/**
 * Episode continuity ledger for DramaForge v1.4.0.
 * Decisions here are author-approved story-plan records, NOT auto-promoted canon.
 * The checker makes deterministic assertions only for explicit tagged claims;
 * prose matches are *suspicions*, and must not be used as factual proof.
 */
import {inspectNarrative, narrativePromptContext, narrativeSignature,assertNarrativeReviewForEpisode} from './narrative.mjs';
const TYPES = new Set(['event','knowledge','foreshadowing']);
const WORKFLOWS = new Set(['outline_first','episode_first']);
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}_${crypto.randomUUID()}`;
const clean = (s, max = 2500) => typeof s === 'string' ? s.trim().slice(0,max) : '';
const eq = (a,b) => clean(a,400).normalize('NFKC').toLocaleLowerCase() === clean(b,400).normalize('NFKC').toLocaleLowerCase();
const episodeNum = (n, optional=false) => {
  if ((n==null || n==='') && optional) return null;
  const v=Number(n);
  if(!Number.isInteger(v)||v<1||v>999) throw Error('회차는 1~999 사이의 정수여야 합니다.');
  return v;
};
const own = (p,n) => p.series.episodes.find(x=>x.number===n);
function touch(p,event,detail={}){
 p.revision=(p.revision||0)+1;p.updatedAt=now();
 p.series.audit.push({id:uid('serieslog'),at:p.updatedAt,event,detail});
}
function deapprove(p, reason, epNumber=null){
 let count=0;
 for (const shot of p.shots||[]) if((epNumber===null||shot.episodeNumber===epNumber)&&shot.status==='approved'){
  shot.status='needs_review';shot.approvedFingerprint=null;count++;
 }
 if(count){p.history ||= [];p.history.push({at:now(),event:'approval_invalidated',reason,count,episodeNumber:epNumber});}
 return count;
}
export function ensureSeries(project){
 if(!project||typeof project!=='object')throw Error('유효한 작품이 아닙니다.');
 if(!project.series)project.series={schemaVersion:1,workflow:'outline_first',outline:'',episodes:[],records:[],changes:[],audit:[]};
 const s=project.series;
 if(s.schemaVersion!==1||!WORKFLOWS.has(s.workflow))throw Error('지원하지 않는 회차 데이터 형식입니다.');
 for(const k of ['episodes','records','changes','audit'])if(!Array.isArray(s[k]))throw Error(`회차 데이터가 손상되었습니다: ${k}`);
 if(s.episodes.length>120||s.records.length>1800||s.changes.length>1800||s.audit.length>20000)throw Error('회차 기록 용량 제한을 초과했습니다.');
 if(typeof s.outline!=='string')throw Error('전체 줄거리 형식이 잘못되었습니다.');
 const seen=new Set();
 for(const ep of s.episodes){const n=episodeNum(ep.number);if(seen.has(n))throw Error('회차 번호가 중복되었습니다.');seen.add(n);if(typeof ep.script!=='string'||typeof ep.summary!=='string'||typeof ep.title!=='string')throw Error('회차 원고 형식이 잘못되었습니다.');}
 for(const r of s.records){
  if(!TYPES.has(r.type)||!['candidate','approved','rejected'].includes(r.status))throw Error('연속성 기록이 손상되었습니다.');
  if(r.status==='approved'){
   const last=r.versions?.at(-1);
   if(!last||last.revision!==r.revision||JSON.stringify(last.data)!==JSON.stringify(recordData(r)))throw Error(`승인된 연속성 기록이 승인본과 다릅니다: ${r.id}`);
  }
 }
 return s;
}
export function setWorkflow(project,workflow){const s=ensureSeries(project);if(!WORKFLOWS.has(workflow))throw Error('제작 방식이 올바르지 않습니다.');if(s.workflow!==workflow){s.workflow=workflow;touch(project,'workflow_changed',{workflow});}return s.workflow;}
export function editOutline(project,text){const s=ensureSeries(project);const value=typeof text==='string'?text.slice(0,60000):'';if(s.outline!==value){s.outline=value;deapprove(project,'전체 줄거리 수정');touch(project,'outline_changed');}return s.outline;}
export function createEpisode(project,{number,title='',summary=''}={}){
 const s=ensureSeries(project);const n=episodeNum(number);
 if(own(project,n))throw Error('이미 존재하는 회차 번호입니다.');
 if(s.episodes.length>=120)throw Error('한 작품의 회차는 최대 120개입니다.');
 const ep={id:uid('episode'),number:n,title:clean(title,150)||`${n}화`,summary:clean(summary,10000),script:'',revision:1,createdAt:now(),updatedAt:now()};
 s.episodes.push(ep);s.episodes.sort((a,b)=>a.number-b.number);touch(project,'episode_created',{episode:n});return ep;
}
export function editEpisode(project,number,patch){
 ensureSeries(project);const n=episodeNum(number),ep=own(project,n);if(!ep)throw Error('회차를 찾을 수 없습니다.');
 const limits={title:150,summary:10000,script:60000};let changed=false;
 for(const [key,max] of Object.entries(limits))if(Object.hasOwn(patch,key)){
  const value=key==='title'?clean(patch[key],max):(typeof patch[key]==='string'?patch[key].slice(0,max):'');if(value!==ep[key]){ep[key]=value;changed=true;}
 }
 if(changed){ep.revision++;ep.updatedAt=now();deapprove(project,`${n}화 수정`,n);touch(project,'episode_edited',{episode:n,revision:ep.revision});}return ep;
}
function shape(type,data){
 const cleanReq=(v,label,max=1500)=>{const x=clean(v,max);if(!x)throw Error(`${label}을(를) 입력하세요.`);return x;};
 if(!TYPES.has(type))throw Error('연속성 기록 유형이 잘못되었습니다.');
 if(type==='event')return {episode:episodeNum(data?.episode),order:((n)=>{if(!Number.isInteger(n)||n<1||n>1000)throw Error('사건 순서가 잘못되었습니다.');return n;})(Number(data?.order??1)),title:cleanReq(data?.title,'사건 제목',200),description:clean(data?.description,2400),sourceQuote:clean(data?.sourceQuote,500)};
 if(type==='knowledge')return {character:cleanReq(data?.character,'인물',150),fact:cleanReq(data?.fact,'알게 된 사실',600),learnedEpisode:episodeNum(data?.learnedEpisode),audienceRevealEpisode:episodeNum(data?.audienceRevealEpisode,true),knowledgeKind:['truth','belief'].includes(data?.knowledgeKind)?data.knowledgeKind:'truth',sourceQuote:clean(data?.sourceQuote,500)};
 const plantedEpisode=episodeNum(data?.plantedEpisode),payoffEpisode=episodeNum(data?.payoffEpisode,true);
 if(payoffEpisode!==null&&payoffEpisode<plantedEpisode)throw Error('복선 회수 시점은 설치 시점보다 빠를 수 없습니다.');
 return {clue:cleanReq(data?.clue,'복선 단서',600),plantedEpisode,payoffEpisode,sourceQuote:clean(data?.sourceQuote,500)};
}
function requireEpisodeRefs(project,type,data){
 const nums=type==='event'?[data.episode]:type==='knowledge'?[data.learnedEpisode]:[data.plantedEpisode];
 for(const n of nums)if(!own(project,n))throw Error(`${n}화가 먼저 등록되어야 합니다.`);
 if(type==='foreshadowing'&&data.payoffEpisode&&!own(project,data.payoffEpisode))throw Error('복선 회수 예정 회차가 등록되지 않았습니다.');
}
export function createSeriesRecord(project,type,data,{actor='author'}={}){
 if(actor!=='author')throw Error('작가만 기록 후보를 등록할 수 있습니다.');
 const s=ensureSeries(project),fields=shape(type,data);requireEpisodeRefs(project,type,fields);
 if(s.records.length>=1800)throw Error('연속성 기록은 최대 1800개입니다. 작품을 분할하세요.');
 const r={id:uid('series'),type,status:'candidate',revision:1,...fields,versions:[],createdAt:now(),updatedAt:now()};
 s.records.push(r);touch(project,'series_candidate',{id:r.id,type});return r;
}
function checkConflictingApproved(project,record,data){
 const others=project.series.records.filter(r=>r.status==='approved'&&r.id!==record.id&&r.type===record.type);
 if(record.type==='knowledge'&&others.some(r=>eq(r.character,data.character)&&eq(r.fact,data.fact)&&r.knowledgeKind===data.knowledgeKind))throw Error('동일한 인물·지식의 승인된 획득 시점이 있습니다. 기존 기록 변경 요청을 사용하세요.');
 if(record.type==='event'&&others.some(r=>eq(r.title,data.title)))throw Error('동일 사건이 다른 승인 기록에 존재합니다. 기존 사건을 변경하세요.');
 if(record.type==='event'&&others.some(r=>r.episode===data.episode&&r.order===data.order))throw Error('동일 회차에 사건 순서가 중복됩니다. 순서를 다르게 지정하세요.');
 if(record.type==='foreshadowing'&&others.some(r=>eq(r.clue,data.clue)))throw Error('동일한 복선이 이미 승인되어 있습니다. 기존 기록을 변경하세요.');
}
export function decideSeriesRecord(project,id,action,{actor='author',expectedRevision}={}){
 if(actor!=='author')throw Error('작가만 연속성 기록을 승인할 수 있습니다.');
 const s=ensureSeries(project),r=s.records.find(r=>r.id===id&&r.status==='candidate');
 if(!r)throw Error('승인 대기 기록을 찾지 못했습니다.');
 if(r.revision!==expectedRevision)throw Error('기록이 수정됐습니다. 최신 기록을 확인하세요.');
 if(!['approved','rejected'].includes(action))throw Error('승인 또는 기각만 가능합니다.');
 if(action==='approved'){checkConflictingApproved(project,r,r);r.versions.push({revision:r.revision,data:recordData(r),approvedAt:now()});deapprove(project,'연속성 기준 확정');}
 r.status=action;r.updatedAt=now();touch(project,'series_decided',{id,action});return r;
}
function recordData(r){const keys=r.type==='event'?['episode','order','title','description','sourceQuote']:r.type==='knowledge'?['character','fact','learnedEpisode','audienceRevealEpisode','knowledgeKind','sourceQuote']:['clue','plantedEpisode','payoffEpisode','sourceQuote'];return Object.fromEntries(keys.map(k=>[k,r[k]]));}
export function proposeSeriesChange(project,id,data,{actor='author'}={}){
 if(actor!=='author')throw Error('작가만 변경 요청을 등록할 수 있습니다.');
 const s=ensureSeries(project),r=s.records.find(r=>r.id===id&&r.status==='approved');
 if(!r)throw Error('승인된 연속성 기록만 변경 요청을 등록할 수 있습니다.');
 const next=shape(r.type,{...recordData(r),...data});requireEpisodeRefs(project,r.type,next);
 if(JSON.stringify(next)===JSON.stringify(recordData(r)))throw Error('변경된 내용이 없습니다.');
 const change={id:uid('serieschange'),recordId:r.id,baseRevision:r.revision,before:recordData(r),after:next,status:'pending',createdAt:now()};
 s.changes.push(change);touch(project,'series_change_requested',{recordId:r.id,changeId:change.id});return change;
}
export function resolveSeriesChange(project,id,{actor='author',approve=false}={}){
 if(actor!=='author')throw Error('작가만 변경을 승인할 수 있습니다.');
 const s=ensureSeries(project),cr=s.changes.find(c=>c.id===id&&c.status==='pending'),r=s.records.find(r=>r.id===cr?.recordId);
 if(!r||r.status!=='approved'||r.revision!==cr.baseRevision)throw Error('변경 요청이 오래되었거나 이미 처리되었습니다.');
 if(approve){checkConflictingApproved(project,r,cr.after);Object.assign(r,cr.after);r.revision++;r.versions.push({revision:r.revision,data:recordData(r),approvedAt:now(),changeId:cr.id});r.updatedAt=now();deapprove(project,'승인된 연속성 기록 변경');}
 cr.status=approve?'approved':'rejected';cr.resolvedAt=now();touch(project,'series_change_resolved',{changeId:id,approve});return cr;
}
export function linkShotEpisode(project,shotId,number){
 ensureSeries(project);const shot=project.shots?.find(s=>s.id===shotId);if(!shot)throw Error('샷이 존재하지 않습니다.');
 const n=episodeNum(number);if(!own(project,n))throw Error('연결할 회차가 없습니다.');
 if(shot.episodeNumber!==n){shot.episodeNumber=n;if(shot.status==='approved'){shot.status='needs_review';shot.approvedFingerprint=null;}touch(project,'shot_episode_linked',{shotId,episode:n});}return shot;
}
export function episodeState(project,number){
 const s=ensureSeries(project),n=episodeNum(number);if(!own(project,n))throw Error('회차가 없습니다.');
 const records=s.records.filter(r=>r.status==='approved');
 const knowledge=records.filter(r=>r.type==='knowledge').map(r=>({id:r.id,character:r.character,fact:r.fact,kind:r.knowledgeKind,learnedEpisode:r.learnedEpisode,audienceRevealEpisode:r.audienceRevealEpisode,characterKnows:n>=r.learnedEpisode,audienceKnows:r.audienceRevealEpisode===null?null:n>=r.audienceRevealEpisode}));
 const events=records.filter(r=>r.type==='event'&&r.episode<=n).sort((a,b)=>a.episode-b.episode||a.order-b.order).map(r=>({id:r.id,episode:r.episode,order:r.order,title:r.title}));
 const clues=records.filter(r=>r.type==='foreshadowing').map(r=>({id:r.id,clue:r.clue,planted:r.plantedEpisode,payoff:r.payoffEpisode,isPlanted:n>=r.plantedEpisode,isDue:r.payoffEpisode!==null&&n>=r.payoffEpisode}));
 return {episode:n,knowledge,events,clues};
}
function textContainsNear(text,a,b,windowSize=120){
 const lower=text.toLocaleLowerCase(),aa=a.toLocaleLowerCase(),bb=b.toLocaleLowerCase();
 let offset=lower.indexOf(aa);while(offset!==-1){const near=lower.slice(Math.max(0,offset-windowSize),offset+aa.length+windowSize);if(near.includes(bb))return true;offset=lower.indexOf(aa,offset+aa.length);}return false;
}
/**
 * Structured evidence format (optional in drafts):
 * [[KNOW:인물|사실]], [[EVENT:사건 제목]], [[CLUE:복선 단서]].
 * Only a KNOW tag in a prematurely dated episode is a deterministic block.
 */
export function inspectEpisode(project,number,{draftText}={}){
 const s=ensureSeries(project),n=episodeNum(number),ep=own(project,n);if(!ep)throw Error('회차를 찾을 수 없습니다.');
 const text=typeof draftText==='string'?draftText:ep.script;
 const approved=s.records.filter(r=>r.status==='approved'),issues=[];
 const add=(severity,code,message,referenceId,evidence='')=>issues.push({severity,code,message,referenceId,evidence});
 const knowTags=[...text.matchAll(/\[\[KNOW:([^\]|]{1,150})\|([^\]]{1,600})\]\]/gi)];
 for(const [,who,fact] of knowTags){
  const matches=approved.filter(r=>r.type==='knowledge'&&eq(r.character,who)&&eq(r.fact,fact));
  if(!matches.length){add('unverified','UNKNOWN_KNOWLEDGE','인물 지식 태그와 대응하는 승인 기록이 없습니다.',null,`${who}|${fact}`);continue;}
  for(const r of matches)if(n<r.learnedEpisode)add('blocked','PREMATURE_KNOWLEDGE',`${r.character}은(는) ${r.learnedEpisode}화부터 이 사실을 알 수 있습니다.`,r.id,`${who}|${fact}`);
 }
 for(const r of approved){
  if(r.type==='knowledge'&&n<r.learnedEpisode&&!knowTags.some(([,who,fact])=>eq(who,r.character)&&eq(fact,r.fact))&&textContainsNear(text,r.character,r.fact))add('warning','POSSIBLE_EARLY_KNOWLEDGE',`아직 모르는 사실이 ${n}화에 언급됩니다. 회상·거짓말·서술자 시점인지 확인하세요.`,r.id,r.fact);
  if(r.type==='event'&&n<r.episode&&text.includes(r.title))add('warning','POSSIBLE_EARLY_EVENT',`${r.episode}화로 계획된 사건이 먼저 언급됩니다. 예고 또는 회상인지 확인하세요.`,r.id,r.title);
  if(r.type==='foreshadowing'){
   if(n<r.plantedEpisode&&text.includes(r.clue))add('warning','POSSIBLE_EARLY_CLUE',`복선 설치 예정 ${r.plantedEpisode}화 이전에 단서가 언급됩니다.`,r.id,r.clue);
   if(r.payoffEpisode!==null&&n===r.payoffEpisode&&!text.includes(r.clue))add('unverified','PAYOFF_NOT_EVIDENCED',`복선 회수 예정 회차입니다. 단서가 원고에서 확인되지 않습니다.`,r.id,r.clue);
  }
 }
 const extra=inspectNarrative(project,n,{draftText:text});issues.push(...extra.issues.map(i=>({...i,origin:'narrative'})));
 return {episode:n,checkedAt:now(),status:issues.some(i=>i.severity==='blocked')?'blocked':issues.length?'needs_review':'no_detected_issue',issues,
  limitations:'승인된 구조화 기록과 텍스트 일치만 확정 검사합니다. 숨은 모순이 없다는 보장이 아닙니다.'};
}
export function seriesSignature(project,number){
 const s=ensureSeries(project),ep=own(project,episodeNum(number));if(!ep)return 'missing-episode';
 return JSON.stringify([ep.number,ep.revision,s.outline,s.records.filter(r=>r.status==='approved').map(r=>[r.id,r.revision,r.type,recordData(r)]),narrativeSignature(project)]);
}
export function assertEpisodeForShot(project,shot){
 if(shot.episodeNumber==null)return null;
 const report=inspectEpisode(project,shot.episodeNumber);
 if(report.status==='blocked')throw Error('연결된 회차 원고에 확정 지식·서사 시점과의 충돌이 있습니다. 수정 후 승인하세요.');
 assertNarrativeReviewForEpisode(project,shot.episodeNumber);
 return report;
}
export function seriesPromptContext(project,number,{maxLength=12000}={}){
 const s=ensureSeries(project),n=episodeNum(number),ep=own(project,n);if(!ep)throw Error('회차가 없습니다.');
 const approved=s.records.filter(r=>r.status==='approved');
 const lines=[`[제작 방식] ${s.workflow}`,`[전체 줄거리] ${s.outline||'미작성'}`,`[현재 회차] ${n}화 ${ep.title}`,`[회차 개요] ${ep.summary||'미작성'}`,'[승인된 회차 사건·지식·복선]'];
 for(const r of approved){if(r.type==='event')lines.push(`EVENT ${r.id}: ${r.episode}화 ${r.order}번째 ${r.title} — ${r.description}`);
  else if(r.type==='knowledge')lines.push(`KNOW ${r.id}: ${r.character} / ${r.fact} / 알고 있는 시점 ${r.learnedEpisode}화~ / 관객 공개 ${r.audienceRevealEpisode??'미정'} / ${r.knowledgeKind}`);
  else lines.push(`CLUE ${r.id}: ${r.clue} / 설치 ${r.plantedEpisode}화 / 회수 ${r.payoffEpisode??'미정'}`);}
 lines.push(narrativePromptContext(project,{maxLength:6500}));
 lines.push('[주의] 승인된 계획을 임의 변경하지 말 것. 미등록·미확정 사실은 가정으로 표시. 시간 순서/인물 지식/복선은 시점별로 구분.');
 const result=lines.join('\n');if(result.length>maxLength)throw Error('회차 맥락이 너무 큽니다. 승인 기록을 분할하세요.');return result;
}
