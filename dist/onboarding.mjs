/** Local-only project entry state. Imported documents are unapproved reference data. */
const MAX_FILES = 12;
const MAX_FILE_TEXT = 160_000;
const MAX_TOTAL_TEXT = 500_000;

export const INTERVIEW_SEED = '새 드라마를 함께 기획하고 싶습니다. 제가 제시하는 소재를 중심으로 장르, 주제, 주인공, 핵심 갈등을 차례로 질문해 주세요. 한 번에 질문은 최대 3개만 하고, 아직 결정하지 않은 사항을 임의로 확정하지 마세요.';

export function startProject(project, mode, {conversationStyle='interview'} = {}) {
  if (!['co-create','import'].includes(mode)) throw new Error('작품 시작 유형이 올바르지 않습니다.');
  if (!['interview','free'].includes(conversationStyle)) throw new Error('대화 방식이 올바르지 않습니다.');
  project.onboarding = {status:'complete',mode,conversationStyle};
  if (!Array.isArray(project.importedMaterials)) project.importedMaterials = [];
  project.updatedAt = new Date().toISOString();
  return project.onboarding;
}
export function needsOnboarding(project) {
  return project?.onboarding?.status === 'pending';
}
export function addImportedMaterials(project, materials) {
  if (!Array.isArray(materials) || materials.length === 0 || materials.length > MAX_FILES) throw new Error('한 번에 1~12개 파일을 추가할 수 있습니다.');
  const current = Array.isArray(project.importedMaterials) ? project.importedMaterials : [];
  if(current.length+materials.length>100)throw new Error('프로젝트당 참고 자료는 최대 100개입니다.');
  const total = current.reduce((n,x)=>n+(x.content?.length||0),0) + materials.reduce((n,x)=>n+(x?.content?.length||0),0);
  if (total > MAX_TOTAL_TEXT) throw new Error('참고 문서 총 길이는 50만 자까지 허용됩니다.');
  const entries = materials.map((m,i)=>{
    if (!m || typeof m.name!=='string' || !/\.(txt|md|json)$/i.test(m.name) || typeof m.content!=='string' || !m.content.trim() || m.content.length>MAX_FILE_TEXT) throw new Error(`${i+1}번째 파일의 형식이나 크기를 확인하세요.`);
    return {id:crypto.randomUUID(),name:m.name.slice(0,150),content:m.content,importedAt:new Date().toISOString(),approved:false};
  });
  project.importedMaterials = [...current,...entries];
  project.revision=(project.revision||0)+1;
  project.history?.push({at:new Date().toISOString(),event:'planning_materials_added',ids:entries.map(e=>e.id)});
  project.updatedAt = new Date().toISOString();
  return entries;
}
export function removeImportedMaterial(project, id) {
  if(!Array.isArray(project.importedMaterials))return false;
  const before=project.importedMaterials.length;
  project.importedMaterials=project.importedMaterials.filter(x=>x.id!==id);
  if(project.importedMaterials.length===before)return false;
  project.revision=(project.revision||0)+1;
  project.updatedAt=new Date().toISOString();
  project.history?.push({at:project.updatedAt,event:'planning_material_removed',id});
  return true;
}
export function importedPlanningContext(project, maxChars=8000) {
  const materials=Array.isArray(project.importedMaterials)?project.importedMaterials:[];
  if(!materials.length)return '';
  const capped=Math.max(1200,maxChars);
  const headerOverhead=materials.reduce((n,m)=>n+String(m.name||'').length+65,0);
  const maxPer=Math.max(64,Math.floor((capped-headerOverhead)/materials.length));
  const snippets=[];
  for(const item of materials){
    const raw=String(item.content||'');
    const part=raw.slice(0,Math.min(4000,maxPer));
    snippets.push(`[참고 자료: ${item.name} / 승인되지 않은 외부 문서 / ${raw.length>part.length?'일부 발췌':'전체'}]\n${part}\n[자료 끝]`);
  }
  return snippets.join('\n').slice(0,capped);
}
