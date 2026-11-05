// Port of NodeCanvas v1.13.0 one-time activation contract. The native launcher
// stores only SHA256(secret), never the secret itself, in the activation file.
import {createHash} from 'node:crypto';

export function validActivationOrigin(value) {
  if(typeof value !== 'string') return false;
  try {
    const u=new URL(value);
    return u.origin===value && !u.username && !u.password &&
      (u.protocol==='https:' || (u.protocol==='http:' &&
      ['127.0.0.1','localhost'].includes(u.hostname) && u.port==='4173'));
  } catch {return false;}
}

export function validActivationRecord(record,now=Date.now()) {
  return Boolean(record && validActivationOrigin(record.origin) &&
    /^[a-f0-9]{64}$/.test(record.challenge) &&
    Number.isSafeInteger(record.createdAt) &&
    record.createdAt<=now+10_000 && now-record.createdAt<=120_000);
}

export class ActivationGrants {
  constructor({now=()=>Date.now(),max=64}={}) {this.pending=new Map();this.now=now;this.max=max;}
  prune(now=this.now()){for(const [k,v] of this.pending)if(v.expires<=now)this.pending.delete(k);}
  approve(record){
    const now=this.now();this.prune(now);
    if(!validActivationRecord(record,now)||this.pending.size>=this.max||this.pending.has(record.challenge))return false;
    this.pending.set(record.challenge,{origin:record.origin,expires:Math.min(now+120_000,record.createdAt+120_000)});
    return true;
  }
  claim(origin,secret){
    const now=this.now();this.prune(now);
    if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))return false;
    const digest=createHash('sha256').update(secret).digest('hex');
    const record=this.pending.get(digest);
    if(!record||record.origin!==origin)return false;
    this.pending.delete(digest);return true;
  }
}
