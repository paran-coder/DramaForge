// NodeCanvas-style native invocation: the browser never receives a token merely
// because its Origin appears on a CORS allowlist.
const ENDPOINTS=['http://127.0.0.1:7331','http://localhost:7331'];
const SESSION_KEY='dramaforge-native-session-v1';
const STABLE_ORIGIN='https://dramaforge-lemon-ten.vercel.app';
export function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
export async function makeActivation(origin,cryptoImpl=globalThis.crypto){
 if(!cryptoImpl?.getRandomValues||!cryptoImpl?.subtle)throw new Error('보안 컨텍스트와 Web Crypto가 필요합니다.');
 const url=new URL(origin);
 if(url.origin!==origin||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)&&url.port==='4173')))throw new Error('연결할 웹 주소가 유효하지 않습니다.');
 const random=cryptoImpl.getRandomValues(new Uint8Array(32)),secret=hex(random);
 const digest=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(secret)),challenge=hex(new Uint8Array(digest));
 return {origin,secret,challenge,url:`dramaforge://connect?origin=${encodeURIComponent(origin)}&challenge=${challenge}`};
}
export class BridgeClient {
 constructor({storage=globalThis.sessionStorage}={}){
  this.storage=storage;this.endpoint=ENDPOINTS[0];this.prepared=null;
  try{this.token=storage?.getItem(SESSION_KEY)||null;}catch{this.token=null;}
 }
 save(){try{if(this.token)this.storage?.setItem(SESSION_KEY,this.token);else this.storage?.removeItem(SESSION_KEY);}catch{}}
 async request(route,body={},auth=true,{timeout=12000}={}){
  const targets=(['presence','claim'].includes(route)||!this.token)?[this.endpoint,...ENDPOINTS.filter(x=>x!==this.endpoint)]:[this.endpoint];let networkError;
  for(const endpoint of targets){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{const response=await fetch(`${endpoint}/api/${route}`,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json',...(auth&&this.token?{'Authorization':`Bearer ${this.token}`}:{})},body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);this.endpoint=endpoint;return data;
   }catch(e){if(e.name==='TypeError'||e.name==='AbortError'){networkError=e;continue;}throw e;}finally{clearTimeout(timer);}}
  throw new Error(networkError?'로컬 연결 앱이 실행되지 않았거나 브라우저의 로컬 네트워크 접근이 차단되었습니다.':'로컬 연결 실패');
 }
 async presence(){return this.request('presence',{},false,{timeout:1800});}
 async prepareActivation(origin=globalThis.location?.origin){this.prepared=await makeActivation(origin);return this.prepared;}
 async reconnect(){if(!this.token)throw new Error('연결 승인이 필요합니다.');try{return await this.status();}catch(e){this.token=null;this.save();throw e;}}
 async activate({origin=globalThis.location?.origin,openProtocol=(url)=>{const link=document.createElement('a');link.href=url;document.body.appendChild(link);link.click();link.remove();},onProgress=()=>{},timeoutMs=45000}={}){
  const activation=this.prepared?.origin===origin?this.prepared:await makeActivation(origin);
  this.prepared=null;const {secret,url}=activation;
  onProgress('PC 연결 앱 실행 요청 중…');openProtocol(url);
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
   try{const result=await this.request('claim',{secret},false,{timeout:1600});this.token=result.token;this.save();return result;}catch(e){
    if(!/승인 대기|만료|실행되지|접근이 차단/.test(e.message))throw e;
   }
   await new Promise(resolve=>setTimeout(resolve,900));
  }
  throw new Error('PC 연결 앱에서 승인되지 않았습니다. 설치 여부와 브라우저의 앱 열기 요청을 확인하세요.');
 }
 // Never issue a privileged token from a passive /connect probe.
 async connect(){return this.reconnect();}
 async pair(){throw new Error('연결코드 방식은 더 이상 지원하지 않습니다.');}
 status(){return this.request('status',{});}
 async login(){if(!this.token)throw new Error('먼저 PC 연결 앱에서 승인이 필요합니다.');return this.request('login',{});}
 async job(mode,prompt,images=[]){if(!this.token)throw new Error('먼저 PC 연결 앱에서 승인이 필요합니다.');const {id}=await this.request('jobs',{mode,prompt,images});const deadline=Date.now()+(mode==='image'?620000:200000);while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,900));const job=await this.request('job',{id});if(job.state==='completed')return job.result;if(['failed','cancelled'].includes(job.state))throw new Error(job.message||'Codex 작업 실패');}await this.request('cancel',{id}).catch(()=>{});throw new Error('작업 시간 제한 초과');}
}
