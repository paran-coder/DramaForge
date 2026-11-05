const ENDPOINT='http://127.0.0.1:7331';
export class BridgeClient {
 constructor(){this.token=null;}
 async request(route,body,auth=true){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(`${ENDPOINT}/api/${route}`,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json',...(auth&&this.token?{'Authorization':`Bearer ${this.token}`}:{})},body:JSON.stringify(body||{}),signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);return data;}catch(e){if(e.name==='TypeError'||e.name==='AbortError')throw new Error('브리지에 연결할 수 없습니다. 실행 상태와 허용 웹 주소를 확인하세요.');throw e;}finally{clearTimeout(timer);}}
 async connect(){const result=await this.request('connect',{},false);this.token=result.token;return result;}
 async pair(code){const result=await this.request('pair',{code},false);this.token=result.token;return result;}
 status(){return this.request('status',{});}
 login(){return this.request('login',{});}
 async job(mode,prompt,images=[]){const {id}=await this.request('jobs',{mode,prompt,images});const deadline=Date.now()+(mode==='image'?620000:200000);while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,900));const job=await this.request('job',{id});if(job.state==='completed')return job.result;if(['failed','cancelled'].includes(job.state))throw new Error(job.message||'Codex 작업 실패');}await this.request('cancel',{id}).catch(()=>{});throw new Error('작업 시간 제한 초과');}
}
