import {normalizeAIGuardClaims,assertShotGuardReady} from './guards.mjs';
import {ensureSeries,seriesSignature,assertEpisodeForShot} from './series.mjs';
import {ensureNarrative} from './narrative.mjs';
export const VERSION='1.7.1';
export const SHOT_STATES=Object.freeze(['draft','needs_review','approved']);
export function uid(prefix='id') {return `${prefix}_${crypto.randomUUID()}`;}
export function newProject(title='새 작품') {return {schemaVersion:2,canon:{schemaVersion:1,decisions:[],changes:[],branches:[],audit:[]},planning:{schemaVersion:1,messages:[],reviews:[],audit:[]},series:{schemaVersion:1,workflow:'outline_first',outline:'',episodes:[],records:[],changes:[],audit:[]},narrative:{schemaVersion:1,records:[],changes:[],audit:[],reviews:[]},id:uid('project'),title,script:'',visualBible:'',shots:[],history:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),revision:0};}
export function cleanText(value,max=2000){return typeof value==='string'?value.trim().slice(0,max):'';}
export function safeShots(raw) {
  if (!Array.isArray(raw)||!raw.length||raw.length>100) throw new Error('샷은 1~100개여야 합니다.');
  return raw.map((item,i)=>{
    if (!item||typeof item!=='object'||Array.isArray(item))throw new Error(`${i+1}번 샷의 형식이 잘못되었습니다.`);
    const shot={id:uid('shot'),episodeNumber:null,scene:cleanText(item.scene||`SC${String(i+1).padStart(2,'0')}`,50),title:cleanText(item.title||`샷 ${i+1}`,120),action:cleanText(item.action,1800),camera:cleanText(item.camera,600),location:cleanText(item.location,250),characters:cleanText(item.characters,500),outfit:cleanText(item.outfit,500),props:cleanText(item.props,500),dialogue:cleanText(item.dialogue,1200),sound:cleanText(item.sound,700),duration:Math.min(30,Math.max(2,Number(item.duration)||8)),prompt:cleanText(item.prompt,5000),status:'draft',approvedFingerprint:null,canonRefs:[],dependsOnShotIds:[],guardClaims:normalizeAIGuardClaims(item.guardClaims),guardReview:null,storyboard:null,videoName:'',notes:''};
    if(!shot.action)throw new Error(`${i+1}번 샷에 action이 없습니다.`);
    return shot;
  });
}
export function fingerprint(shot,project) {
  // Deliberately simple signature: revision invalidates approvals for changed global contexts.
  return JSON.stringify([project.script,project.visualBible,shot.scene,shot.title,shot.action,shot.camera,shot.location,shot.characters,shot.outfit,shot.props,shot.dialogue,shot.sound,shot.duration,shot.prompt,(shot.canonRefs||[]).slice().sort(),(shot.dependsOnShotIds||[]).slice().sort(),shot.guardClaims||[],shot.episodeNumber,shot.episodeNumber==null?null:seriesSignature(project,shot.episodeNumber)]);
}
export function invalidateApprovals(project,reason='기준 데이터 수정') {
  let count=0;
  for(const shot of project.shots){if(shot.status==='approved'){shot.status='needs_review';shot.approvedFingerprint=null;count++;}}
  if(count)project.history.push({at:new Date().toISOString(),event:'approval_invalidated',reason,count});
  project.revision++;project.updatedAt=new Date().toISOString();
  return count;
}
export function approveShot(project,shotId){const shot=project.shots.find(s=>s.id===shotId);if(!shot)throw new Error('샷을 찾을 수 없습니다.');if(!shot.action||!shot.prompt)throw new Error('행동과 프롬프트가 필요합니다.');assertEpisodeForShot(project,shot);assertShotGuardReady(project,shotId);shot.status='approved';shot.approvedFingerprint=fingerprint(shot,project);project.history.push({at:new Date().toISOString(),event:'approved',shotId});project.updatedAt=new Date().toISOString();return shot;}
/** Only output finalized prompts from an approved, still-consistent shot. */
export function exportApprovedSeedancePrompt(project,shotId){
  const shot=project.shots.find(s=>s.id===shotId);
  if(!shot||shot.status!=='approved')throw new Error('승인된 샷만 최종 프롬프트를 내보낼 수 있습니다.');
  assertEpisodeForShot(project,shot);assertShotGuardReady(project,shotId);
  if(shot.approvedFingerprint!==fingerprint(shot,project))throw new Error('승인된 샷이 수정되었습니다. 다시 승인하세요.');
  return shot.prompt;
}
export function editShot(project,shotId,patch){const shot=project.shots.find(s=>s.id===shotId);if(!shot)throw new Error('샷을 찾을 수 없습니다.');const fields=['title','action','camera','location','characters','outfit','props','dialogue','sound','prompt','notes','videoName'];const changed=[];for(const f of fields)if(Object.hasOwn(patch,f)&&shot[f]!==patch[f]){shot[f]=cleanText(patch[f],f==='prompt'?5000:2000);changed.push(f);}if(Object.hasOwn(patch,'duration')){const value=Number(patch.duration);if(Number.isFinite(value)&&value>=2&&value<=30&&value!==shot.duration){shot.duration=value;changed.push('duration');}}if(changed.length&&shot.status==='approved'){shot.status='needs_review';shot.approvedFingerprint=null;project.history.push({at:new Date().toISOString(),event:'approval_invalidated',shotId,reason:'샷 수정'});}if(changed.length){project.revision++;project.updatedAt=new Date().toISOString();}return shot;}
export function compileSeedancePrompt(shot,visualBible=''){
 return [`[SHOT] ${shot.scene} / ${shot.title} / ${shot.duration}s`, '[VISUAL CONTINUITY]', visualBible.slice(0,1400)||'Use approved reference images and preserve character identity.', `Characters: ${shot.characters||'not specified'}`,`Outfit: ${shot.outfit||'not specified'}`,`Props: ${shot.props||'not specified'}`,`Location: ${shot.location||'not specified'}`,'[CAMERA]',shot.camera||'Natural cinematic framing.','[ACTION]',shot.action,'[DIALOGUE - original language]',shot.dialogue||'No dialogue.','[SOUND]',shot.sound||'Natural ambient sound.','[CONSTRAINTS]','Preserve identity, outfit and prop continuity. No extra characters, subtitles, logos, or scene changes unless requested.'].join('\n');
}
export function previewShotsFromScript(script){
 const text=cleanText(script,25000);if(!text)throw new Error('먼저 대본을 입력하세요.');
 const chunks=text.split(/(?=^(?:SCENE|SC\.?|장면|씬|#)\s*\d*[:.\- ]?)/gmi).map(s=>s.trim()).filter(Boolean).slice(0,16);
 const parts=chunks.length?chunks:[text];
 return safeShots(parts.flatMap((part,i)=>{
   const lines=part.split(/\n/).map(s=>s.trim()).filter(Boolean); const summary=lines.slice(0,7).join(' ').slice(0,800);
   return [{scene:`SC${String(i+1).padStart(2,'0')}`,title:`장면 ${i+1} · 첫 샷`,action:summary,camera:'Medium shot, fixed camera',duration:8,dialogue:'',sound:''}];
 }));
}
export function validateImportedProject(p){if(!p||![1,2].includes(p.schemaVersion)||typeof p.id!=='string'||typeof p.title!=='string'||!Array.isArray(p.shots)||p.shots.length>500)throw new Error('지원되지 않는 프로젝트입니다.'); if(p.shots.some(s=>!s||typeof s.id!=='string'||!SHOT_STATES.includes(s.status)))throw new Error('샷 데이터가 손상되었습니다.');if(p.schemaVersion===1){p.schemaVersion=2;p.canon={schemaVersion:1,decisions:[],changes:[],branches:[],audit:[]};}if(!p.canon)p.canon={schemaVersion:1,decisions:[],changes:[],branches:[],audit:[]};if(p.importedMaterials!==undefined){if(!Array.isArray(p.importedMaterials)||p.importedMaterials.length>100||p.importedMaterials.reduce((n,x)=>n+(typeof x?.content==='string'?x.content.length:1_000_000),0)>500_000||p.importedMaterials.some(x=>!x||typeof x.name!=='string'||typeof x.content!=='string'||x.content.length>160_000))throw Error('참고 문서 데이터 형식 또는 용량 오류');}for(const shot of p.shots){if(!Array.isArray(shot.canonRefs))shot.canonRefs=[];if(!Array.isArray(shot.guardClaims))shot.guardClaims=[];if(!Array.isArray(shot.dependsOnShotIds))shot.dependsOnShotIds=[];}ensureSeries(p);ensureNarrative(p);return p;}
export function extractShotsFromAI(content){let raw=String(content||'').trim();const code=raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);if(code)raw=code[1];let data;try{data=JSON.parse(raw)}catch{const start=raw.indexOf('{'),end=raw.lastIndexOf('}');if(start===-1||end<=start)throw new Error('AI가 유효한 JSON을 반환하지 않았습니다.');data=JSON.parse(raw.slice(start,end+1));}return safeShots(Array.isArray(data)?data:data.shots);}
