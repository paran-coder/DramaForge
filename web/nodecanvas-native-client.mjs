/*
 * Compatibility client for the EXACT NodeCanvas v1.13.0 connector.
 * It uses the existing NodeCanvas installation, Windows protocol handler,
 * activation grant, and API names; the original EXE is not modified.
 *
 * Source API: 2026-10-31-server.mjs in the user-supplied NodeCanvas archive.
 * The original server provides account login/status and IMAGE jobs only.
 */
const ENDPOINTS = ['http://127.0.0.1:7330', 'http://localhost:7330'];
const SESSION_KEY = 'dramaforge-nodecanvas-token-v1';
const ID_KEY = 'dramaforge-nodecanvas-tab-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export function hex(bytes) { return [...bytes].map(n => n.toString(16).padStart(2, '0')).join(''); }
export async function makeActivation(origin, cryptoImpl=globalThis.crypto) {
  if (!cryptoImpl?.getRandomValues || !cryptoImpl?.subtle) throw new Error('보안 연결(HTTPS)과 Web Crypto가 필요합니다.');
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname) && url.port === '7330'))) {
    throw new Error('NodeCanvas에서 승인할 수 없는 웹 주소입니다.');
  }
  const secret = hex(cryptoImpl.getRandomValues(new Uint8Array(32)));
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const challenge = hex(new Uint8Array(digest));
  return {origin, secret, challenge, url:`nodecanvas://connect?origin=${encodeURIComponent(origin)}&challenge=${challenge}`};
}

export class BridgeClient {
  constructor({storage=globalThis.sessionStorage}={}) {
    this.storage=storage;
    this.endpoint=ENDPOINTS[0];
    this.prepared=null;
    this.leaseController=null;
    this.leaseReader=null;
    this.heartbeatTimer=null;
    try {
      this.token=storage?.getItem(SESSION_KEY)||null;
      this.tabId=storage?.getItem(ID_KEY)||null;
    } catch { this.token=null; this.tabId=null; }
    if (!this.tabId) {
      this.tabId=globalThis.crypto?.randomUUID?.()||`tab-${Math.random().toString(36).slice(2)}`;
      try { storage?.setItem(ID_KEY,this.tabId); } catch { /* memory-only */ }
    }
  }
  save() { try { if(this.token) this.storage?.setItem(SESSION_KEY,this.token); else this.storage?.removeItem(SESSION_KEY); } catch { /* memory-only */ } }
  async request(route, data={}, auth=true, {timeout=12000}={}) {
    const endpoints=[this.endpoint,...ENDPOINTS.filter(x=>x!==this.endpoint)];
    let lastError;
    for(const endpoint of endpoints) {
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
      try {
        const res=await fetch(`${endpoint}/api/${route}`, {
          method:'POST', mode:'cors', cache:'no-store',
          headers:{'Content-Type':'application/json',...(auth&&this.token?{Authorization:`Bearer ${this.token}`}:{})},
          body:JSON.stringify(data),signal:controller.signal
        });
        const result=await res.json();
        if(!res.ok) {
          const error=new Error(result.error||`HTTP ${res.status}`);
          error.status=res.status;
          throw error;
        }
        this.endpoint=endpoint;
        return result;
      } catch(error) {
        if(error.name==='AbortError' || error instanceof TypeError) {lastError=error;continue;}
        throw error;
      } finally {clearTimeout(timer);}
    }
    throw new Error(lastError?'NodeCanvas PC 연결 앱이 실행되지 않았거나 브라우저 로컬 네트워크 접근이 차단됐습니다.':'NodeCanvas 연결 실패');
  }
  async presence(){return this.request('presence',{},false,{timeout:1800});}
  async prepareActivation(origin=globalThis.location?.origin){this.prepared=await makeActivation(origin);return this.prepared;}
  async reconnect(){
    if(!this.token)throw new Error('PC에서 NodeCanvas 연결을 먼저 승인해 주세요.');
    try {const s=await this.status();this.startLease();return s;}
    catch(error){this.token=null;this.save();this.stopLease();throw error;}
  }
  async activate({origin=globalThis.location?.origin,openProtocol=(url)=>{
    const link=document.createElement('a');link.href=url;document.body.appendChild(link);link.click();link.remove();
  },onProgress=()=>{},timeoutMs=45000}={}) {
    const activation=this.prepared?.origin===origin?this.prepared:await makeActivation(origin);
    this.prepared=null;
    onProgress('NodeCanvas PC 앱 실행 요청 중…');
    openProtocol(activation.url);
    const deadline=Date.now()+timeoutMs;
    let lastError;
    while(Date.now()<deadline) {
      try {
        const result=await this.request('claim',{secret:activation.secret,tabId:this.tabId},false,{timeout:1600});
        this.token=result.token;this.save();this.startLease();return result;
      } catch(error) {
        lastError=error;
        // NodeCanvas returns 401 while Windows approval or native launch is pending.
        if(error.status && error.status!==401 && error.status!==403) throw error;
      }
      await sleep(900);
    }
    throw new Error('NodeCanvas PC 앱 승인 시간이 초과됐습니다. Windows 앱 열기/웹 주소 확인창을 살펴보세요.'+(lastError?.status===403?' 사이트 출처 허용 여부도 확인해 주세요.':''));
  }
  async connect(){return this.reconnect();}
  async pair(){throw new Error('NodeCanvas 연결코드가 아닌 PC 앱 승인 방식으로 연결하세요.');}
  startLease(){
    if(!this.token||typeof window==='undefined'||this.leaseController)return;
    const controller=new AbortController(),token=this.token,endpoint=this.endpoint;
    this.leaseController=controller;
    void (async()=>{
      try {
        const res=await fetch(`${endpoint}/api/lease`,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({tabId:this.tabId}),signal:controller.signal});
        if(!res.ok||!res.body)throw Error('lease failed');
        this.leaseReader=res.body.getReader();
        while(!(await this.leaseReader.read()).done) {}
      } catch { /* best-effort lease, recover on next activation */ }
      finally { if(this.leaseController===controller){this.leaseController=null;this.leaseReader=null;} }
    })();
    this.heartbeatTimer=setInterval(()=>{void this.request('heartbeat',{tabId:this.tabId}).catch(()=>{});},30_000);
  }
  stopLease(){this.leaseController?.abort();this.leaseController=null;if(this.heartbeatTimer){clearInterval(this.heartbeatTimer);this.heartbeatTimer=null;}}
  status(){return this.request('status',{}).then(result=>({...result,installed:true}));}
  login(){if(!this.token)throw new Error('PC 앱 연결 승인이 먼저 필요합니다.');return this.request('login',{remember:true});}
  async job(mode,prompt,images=[]){
    if(!this.token)throw new Error('PC 앱 연결 승인이 먼저 필요합니다.');
    if(mode!=='image')throw new Error('NodeCanvas 원본 v1.13.0 연결 앱은 이미지 생성만 지원합니다. 대본·샷 텍스트 생성 기능은 별도 연동이 필요하며 아직 제공되지 않습니다.');
    const {id}=await this.request('jobs',{kind:'generate',prompt,images,ratio:'16:9'});
    const deadline=Date.now()+620000;
    while(Date.now()<deadline) {
      await sleep(900);
      const state=await this.request('job',{id});
      if(state.state==='completed') {
        const image=state.images?.[0];
        if(typeof image!=='string'||!image.startsWith('data:image/'))throw new Error('이미지 결과가 없습니다.');
        return {image};
      }
      if(['failed','cancelled'].includes(state.state)) throw new Error(state.message||'NodeCanvas 이미지 생성 실패');
    }
    await this.request('cancel',{id}).catch(()=>{});
    throw new Error('NodeCanvas 이미지 생성 시간 초과');
  }
}
