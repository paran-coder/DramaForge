/**
 * On-device, deterministic *hints* for the writing desk.
 * All results are advisory, not semantic proof and never change the canon.
 * No network or storage side effects. All evidence quotes are from the author's input.
 */
import {ensureCanon,findSimilarDecisions} from './canon.mjs';
import {activeRules} from './guards.mjs';
import {ensureSeries,inspectEpisode} from './series.mjs';
const normalized = s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu,'');
function excerptLines(source){return String(source||'').split(/\n+|(?<=[.!?。])\s+/u).map(s=>s.trim()).filter(s=>s.length>=4).slice(0,250);}
function item(kind,priority,title,sourceQuote,explanation,suggestion,referenceId=''){
 return {kind,priority,title,sourceQuote,explanation,suggestion,referenceId,origin:'local-heuristic'};
}
function hasNegativeNear(line,value){
 const compact=normalized(line),token=normalized(value);
 if(!token||!compact.includes(token))return false;
 const rest=compact.slice(compact.indexOf(token)+token.length,compact.indexOf(token)+token.length+24);
 return /^(은|는|이|가|도|와|과|인|라고|이라|가?)(아니다|아니|아니었|아닌|없다|없었|않|못|불가능)|^(아니다|아니|없|않|못)/u.test(rest);
}
/**
 * No automatic blocking: negation, quotes, flashbacks, dramatic irony and imposture
 * cannot be distinguished reliably with lexical matching.
 */
export function inspectLocalDraft(project,{draftText='',proposalText='',episodeNumber=null,limit=12}={}){
 ensureCanon(project);ensureSeries(project);
 const all=[],lines=excerptLines(draftText),proposal=String(proposalText||'').trim();
 const approved=project.canon.decisions.filter(d=>d.status==='approved');
 const approvedById=new Map(approved.map(d=>[d.id,d]));
 if(proposal.length>=9){
   for(const found of findSimilarDecisions(project,proposal,0.56).slice(0,4)){
     if(found.status==='candidate')continue;
     all.push(item('duplicate','medium',found.status==='rejected'?'기각된 아이디어와 표현 유사':'이전에 확정한 기획과 표현 유사',proposal.slice(0,450),
       `이전 결정 ${found.id}과 문자 수준의 표현 유사성이 관찰됩니다. 같은 주장인지 문맥을 확인하세요.`,
       found.status==='rejected'?'기각 사유와 당시 전제가 달라졌는지 검토한 다음 변경된 전제의 근거를 등록하세요.':'기존 결정을 다시 확정하지 말고 필요한 경우 변경 요청을 작성하세요.',found.id));
   }
 }
 const rules=activeRules(project).filter(r=>approvedById.has(r.decisionId));
 for(const line of lines){
   for(const rule of rules){
     const subject=normalized(rule.subject),attr=normalized(rule.attribute),val=normalized(rule.value),compact=normalized(line);
     if(!subject||!val||!compact.includes(subject))continue;
     if(hasNegativeNear(line,rule.value)){
       all.push(item('canon','high','확정 설정의 부정 표현 의심',line.slice(0,450),
        `${rule.subject}/${rule.attribute}에 대한 승인 값 '${rule.value}'을 부정하는 표현이 있습니다. 대사·회상·거짓말인지 확인하세요.`,
        '원문 맥락을 확인해 기존 정설을 유지하도록 수정하거나, 정설 변경 요청을 별도로 작성하세요.',rule.decisionId));
     }else if(attr&&compact.includes(attr)&&!compact.includes(val)){
       all.push(item('character','low','확정 상태와 다른 서술 가능성',line.slice(0,450),
        `${rule.subject}/${rule.attribute}의 승인 값 '${rule.value}'이(가) 해당 구절에서 확인되지 않습니다. 단순 언급일 수도 있습니다.`,
        '해당 인물의 상태가 실제로 변경되는 장면인지 확인하고 필요한 경우 샷·정설 연결 정보를 갱신하세요.',rule.decisionId));
     }
   }
 }
 if(episodeNumber!==null&&episodeNumber!==undefined){
   const num=Number(episodeNumber);
   if(Number.isInteger(num)&&project.series.episodes.some(e=>e.number===num)){
     const report=inspectEpisode(project,num,{draftText:String(draftText)});
     for(const issue of report.issues){
       const excerpt=lines.find(x=>issue.evidence&&normalized(x).includes(normalized(issue.evidence)))||String(issue.evidence||'');
       all.push(item('continuity',issue.severity==='blocked'?'high':'medium',
         issue.severity==='blocked'?'회차의 명시적 연속성 충돌':'회차 연속성 검토 필요',excerpt.slice(0,450),issue.message,
         '회차별 승인된 사건·지식·복선 기록을 대조하고, 의도적인 반전·회상인지 작가가 판단하세요.',issue.referenceId||''));
     }
   }
 }
 // Remove exact duplicates without hiding distinct evidence from separate episodes.
 const seen=new Set(),deduped=[];
 for(const risk of all){const key=[risk.kind,risk.referenceId,normalized(risk.sourceQuote)].join('/');if(seen.has(key))continue;seen.add(key);deduped.push(risk);}
 const weight={high:0,medium:1,low:2};deduped.sort((a,b)=>weight[a.priority]-weight[b.priority]);
 return {issues:deduped.slice(0,Math.min(50,Math.max(1,limit))),total:deduped.length,counts:{high:deduped.filter(x=>x.priority==='high').length,medium:deduped.filter(x=>x.priority==='medium').length,low:deduped.filter(x=>x.priority==='low').length},
  limitation:'문자 기반 탐지입니다. 창작 맥락과 숨은 모순을 이해하지 못하며 정설을 자동 수정하거나 승인을 차단하지 않습니다.'};
}
