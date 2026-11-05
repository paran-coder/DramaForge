import http from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile,readdir,unlink,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CodexBridgeProvider} from './provider.mjs';
import {ActivationGrants,validActivationOrigin} from './activation.mjs';

export const VERSION='1.8.1';
const STABLE_ORIGIN='https://dramaforge-lemon-ten.vercel.app';
const DEFAULT_ORIGINS=[STABLE_ORIGIN,'http://127.0.0.1:4173','http://localhost:4173'];
export function verifyToken(header,token){if(typeof header!=='string'||typeof token!=='string')return false;const a=Buffer.from(header),b=Buffer.from(`Bearer ${token}`);return a.length===b.length&&timingSafeEqual(a,b);}
export function validateRequest(body){if(!body||!['shots','image','canon','review'].includes(body.mode)||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>28000)throw new Error('유효한 작업 유형과 28,000자 이하 프롬프트가 필요합니다.');const images=body.images??[];if(!Array.isArray(images)||images.length>3||images.some(s=>typeof s!=='string'||s.length>7_000_000))throw new Error('참조 이미지는 최대 3장, 각 5MB까지 허용합니다.');return{mode:body.mode,prompt:body.prompt.trim(),images};}

export async function createBridge({port=7331,origins=DEFAULT_ORIGINS,activationDir=null,provider=new CodexBridgeProvider(),now=()=>Date.now()}={}){
  const allow=new Set(origins);
  if([...allow].some(o=>!validActivationOrigin(o)))throw new Error('허용된 origin은 HTTPS 또는 지정된 로컬 개발 주소여야 합니다.');
  const grants=new ActivationGrants({now}),sessions=new Map(),jobs=new Map();
  let active=null,closed=false;
  function reply(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
  async function parse(req){if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(new Error('JSON 요청만 허용합니다.'),{status:415});const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>8_000_000)throw Object.assign(new Error('요청 크기 제한 초과'),{status:413});parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Object.assign(new Error('JSON 파싱 오류'),{status:400});}}
  let reading=Promise.resolve();
  async function readActivations(){
    if(!activationDir)return;
    await mkdir(activationDir,{recursive:true});
    const names=(await readdir(activationDir)).filter(n=>/^[a-f0-9-]{8,64}\.json$/.test(n)).slice(0,64);
    for(const name of names){
      const file=path.join(activationDir,name);
      try{const record=JSON.parse(await readFile(file,'utf8'));if(allow.has(record.origin))grants.approve(record);}catch{}finally{await unlink(file).catch(()=>{});}
    }
  }
  function loadActivations(){reading=reading.then(readActivations,readActivations);return reading;}
  function sessionFor(header,origin){
    if(typeof header!=='string'||!header.startsWith('Bearer '))return null;
    const value=header.slice(7);if(!/^[a-f0-9]{64}$/.test(value))return null;
    const session=sessions.get(value);if(!session||session.origin!==origin)return null;
    if(now()-session.lastUsed>3_600_000){sessions.delete(value);return null;}
    session.lastUsed=now();return session;
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');
    try{
      if(closed)return reply(res,503,{error:'브리지 종료 중입니다.'});
      if(![`127.0.0.1:${actualPort}`,`localhost:${actualPort}`].includes(req.headers.host))return reply(res,403,{error:'Host 오류'});
      const route=new URL(req.url,'http://localhost').pathname;
      // Not a browser auth endpoint. The health probe exposes no bearer/account data.
      if(route==='/health'&&req.method==='GET'&&!req.headers.origin)return reply(res,200,{ok:true,service:'dramaforge-bridge',version:VERSION});
      if(!route.startsWith('/api/'))return reply(res,404,{error:'지원하지 않는 경로'});
      await loadActivations();
      if(!allow.has(req.headers.origin))return reply(res,403,{error:'웹사이트 출처를 허용하지 않았습니다.'});
      res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Private-Network','true');
      if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
      if(req.method!=='POST')return reply(res,405,{error:'POST만 허용합니다.'});
      if(route==='/api/connect'||route==='/api/pair')return reply(res,410,{error:'연결코드 및 자동 토큰 발급은 제거되었습니다. PC 연결 앱을 열어 승인하세요.'});
      if(!['/api/presence','/api/claim'].includes(route)&&!sessionFor(req.headers.authorization,req.headers.origin))return reply(res,401,{error:'PC 연결 앱을 실행하여 새 연결을 승인하세요.'});
      const data=await parse(req);
      if(route==='/api/presence')return reply(res,200,{app:'DramaForge',version:VERSION,activation:'native-required'});
      if(route==='/api/claim'){
        if(!grants.claim(req.headers.origin,data.secret))return reply(res,401,{error:'PC 연결 앱의 승인 대기 중이거나 연결 요청이 만료되었습니다.'});
        for(const [id,s] of sessions)if(now()-s.lastUsed>3_600_000)sessions.delete(id);
        if(sessions.size>=32)sessions.delete(sessions.keys().next().value);
        const token=randomBytes(32).toString('hex');sessions.set(token,{origin:req.headers.origin,lastUsed:now()});
        return reply(res,200,{token,version:VERSION});
      }
      if(route==='/api/status')return reply(res,200,await provider.status());
      if(route==='/api/login')return reply(res,200,await provider.login());
      if(route==='/api/jobs'){
        if(active)return reply(res,409,{error:'다른 AI 작업이 이미 실행 중입니다.'});
        const jobInput=validateRequest(data),id=randomUUID(),ctrl=new AbortController(),job={id,state:'running',message:'Codex 요청 처리 중',createdAt:now()};
        jobs.set(id,job);active={id,ctrl};while(jobs.size>20)jobs.delete(jobs.keys().next().value);
        void provider.createJob(jobInput,{signal:ctrl.signal}).then(result=>{if(!ctrl.signal.aborted)Object.assign(job,{state:'completed',result,message:'완료'});}).catch(e=>{Object.assign(job,{state:ctrl.signal.aborted?'cancelled':'failed',message:e.message});}).finally(()=>{if(active?.id===id)active=null;});
        return reply(res,202,{id});
      }
      if(route==='/api/job'){const job=jobs.get(data.id);return job?reply(res,200,job):reply(res,404,{error:'작업을 찾지 못했습니다.'});}
      if(route==='/api/cancel'){if(active?.id===data.id){active.ctrl.abort();await provider.cancel?.();}return reply(res,200,{ok:true});}
      return reply(res,404,{error:'지원하지 않는 API'});
    }catch(e){if(!res.headersSent)reply(res,e.status||400,{error:e.message||'요청 실패'});else res.end();}
  });
  server.requestTimeout=60_000;server.headersTimeout=15_000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const actualPort=server.address().port;
  return{port:actualPort,approveActivation:(record)=>allow.has(record?.origin)&&grants.approve(record),loadActivations,close:async()=>{closed=true;active?.ctrl.abort();await provider.shutdown?.();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--origin'),origins=[...DEFAULT_ORIGINS];
 if(i>=0){const site=new URL(process.argv[i+1]).origin;if(!validActivationOrigin(site))throw new Error('연결 웹주소는 허용되는 HTTPS 출처여야 합니다.');origins.push(site);}
 const bridge=await createBridge({origins,activationDir:process.env.DRAMAFORGE_ACTIVATION_DIR||null});
 console.log(`DramaForge Bridge v${VERSION} / http://127.0.0.1:${bridge.port}\n활성화: dramaforge://connect (운영체제 연결 앱)\n연결 코드 없이 사용자 승인 필요`);
 if(process.env.DRAMAFORGE_ACTIVATION_DIR){
  process.stdin.setEncoding('utf8');
  process.stdin.on('data',data=>{if(data.trim()==='shutdown')void bridge.close().then(()=>process.exit(0));});
  process.stdin.on('end',()=>void bridge.close().then(()=>process.exit(0)));
 }
 for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>void bridge.close().then(()=>process.exit(0)));
}
