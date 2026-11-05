import http from 'node:http';import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';import {CodexBridgeProvider} from './provider.mjs';
export function verifyToken(header,token){if(typeof header!=='string')return false;const a=Buffer.from(header),b=Buffer.from(`Bearer ${token}`);return a.length===b.length&&timingSafeEqual(a,b);}
export function validateRequest(body){if(!body||!['shots','image','canon','review'].includes(body.mode)||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>28000)throw new Error('유효한 작업 유형과 28,000자 이하 프롬프트가 필요합니다.');const images=body.images??[];if(!Array.isArray(images)||images.length>3||images.some(s=>typeof s!=='string'||s.length>7_000_000))throw new Error('참조 이미지는 최대 3장, 각 5MB까지 허용합니다.');return{mode:body.mode,prompt:body.prompt.trim(),images};}
export async function createBridge({port=7331,origins=['http://127.0.0.1:4173','http://localhost:4173'],pairCode=randomBytes(8).toString('hex'),provider=new CodexBridgeProvider()}={}){
 const allow=new Set(origins),token=randomBytes(32).toString('hex'),jobs=new Map();let active=null,failures=0,blockedUntil=0;
 function reply(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
 async function parse(req){if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(new Error('JSON 요청만 허용합니다.'),{status:415});const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>8_000_000)throw Object.assign(new Error('요청 크기 제한 초과'),{status:413});parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Object.assign(new Error('JSON 파싱 오류'),{status:400});}}
 const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');try{
  if(![`127.0.0.1:${actualPort}`,`localhost:${actualPort}`].includes(req.headers.host))return reply(res,403,{error:'Host 오류'});const route=new URL(req.url,'http://localhost').pathname;if(!route.startsWith('/api/'))return reply(res,404,{error:'지원하지 않는 경로'});
  if(!allow.has(req.headers.origin))return reply(res,403,{error:'이 웹 주소는 허용되지 않았습니다. --origin 값을 확인하세요.'});res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Private-Network','true');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}if(req.method!=='POST')return reply(res,405,{error:'POST만 허용합니다.'});
  if(!['/api/pair','/api/connect'].includes(route)&&!verifyToken(req.headers.authorization,token))return reply(res,401,{error:'브리지 연결 코드로 먼저 인증하세요.'});const data=await parse(req);
  // The owner explicitly starts the loopback helper with a trusted --origin.
  // Only that exact Origin may receive the short-lived in-memory session token.
  if(route==='/api/connect')return reply(res,200,{token,version:'1.7.1',authorization:'origin-allowlist'});
  if(route==='/api/pair'){if(Date.now()<blockedUntil)return reply(res,429,{error:'1분간 페어링이 잠겼습니다.'});if(!verifyToken(`Bearer ${data.code}`,pairCode)){if(++failures>=8){failures=0;blockedUntil=Date.now()+60000;}return reply(res,401,{error:'연결 코드가 일치하지 않습니다.'});}failures=0;return reply(res,200,{token,version:'1.7.1'});}
  if(route==='/api/status')return reply(res,200,await provider.status());
  if(route==='/api/login')return reply(res,200,await provider.login());
  if(route==='/api/jobs'){if(active)return reply(res,409,{error:'다른 AI 작업이 이미 실행 중입니다.'});const jobInput=validateRequest(data);const id=randomUUID(),ctrl=new AbortController(),job={id,state:'running',message:'Codex 요청 처리 중',createdAt:Date.now()};jobs.set(id,job);active={id,ctrl};while(jobs.size>20)jobs.delete(jobs.keys().next().value);void provider.createJob(jobInput,{signal:ctrl.signal}).then(result=>{if(!ctrl.signal.aborted)Object.assign(job,{state:'completed',result,message:'완료'});}).catch(e=>{Object.assign(job,{state:ctrl.signal.aborted?'cancelled':'failed',message:e.message});}).finally(()=>{if(active?.id===id)active=null;});return reply(res,202,{id});}
  if(route==='/api/job'){const job=jobs.get(data.id);return job?reply(res,200,job):reply(res,404,{error:'작업을 찾지 못했습니다.'});}
  if(route==='/api/cancel'){if(active?.id===data.id){active.ctrl.abort();await provider.cancel?.();}return reply(res,200,{ok:true});}
  return reply(res,404,{error:'지원하지 않는 API'});
 }catch(e){if(!res.headersSent)reply(res,e.status||400,{error:e.message||'요청 실패'});else res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});const actualPort=server.address().port;
 return{port:actualPort,pairCode,close:async()=>{active?.ctrl.abort();await provider.shutdown?.();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--origin'),origins=i>=0?[new URL(process.argv[i+1]).origin]:undefined;if(origins&&!origins[0].startsWith('https://')&&!origins[0].startsWith('http://localhost')&&!origins[0].startsWith('http://127.0.0.1'))throw new Error('배포 주소는 HTTPS여야 합니다.');
 const bridge=await createBridge({origins});console.log(`DramaForge Bridge v1.7.1\n주소: http://127.0.0.1:${bridge.port}\n브라우저 연결: 허용된 출처에서 코드 없이 승인\n허용 웹 주소: ${(origins||['http://127.0.0.1:4173','http://localhost:4173']).join(', ')}\n종료: Ctrl+C`);
 for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>void bridge.close().then(()=>process.exit(0)));
}
