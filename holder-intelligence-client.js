/* Opt-in holder client. No startup requests, storage, DOM writes, or trading. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MoerHolderIntelligence=factory();})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  class ClientError extends Error {constructor(code,status){super(code);this.name='HolderClientError';this.code=code;this.status=status;}}
  const fail=code=>{throw new ClientError(code)};
  const id=value=>{if(typeof value!=='string'||!/^[a-f0-9]{32}$/.test(value))fail('INVALID_ID');return value;};
  function createClient({enabled=false,baseURL,allowedOrigins=[],fetch:fetcher,getSession,onUnauthorized=()=>{},allowedPairs=[],eventTarget,timeoutMs=30000}={}){
    if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)fail('INVALID_TIMEOUT');
    let generation=0,disposed=false;const controllers=new Set();
    const invalidate=()=>{generation++;for(const c of controllers)c.abort();controllers.clear();};
    if(eventTarget)eventTarget.addEventListener('basedmoer:wallet',invalidate);
    let base;
    if(enabled){
      if(typeof fetcher!=='function'||typeof getSession!=='function')fail('INVALID_CONFIG');
      try{base=new URL(baseURL);}catch{fail('INVALID_CONFIG');}
      if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/'||!allowedOrigins.includes(base.origin))fail('UNTRUSTED_API');
    }
    const pairs=new Set(allowedPairs);
    if(allowedPairs.some(p=>typeof p!=='string'||!/^[A-Z0-9]{1,32}$/.test(p)))fail('INVALID_PAIRS');
    function session(){
      const s=getSession();
      if(!s||s.verified!==true||typeof s.wallet!=='string'||!/^0x[a-f0-9]{40}$/i.test(s.wallet)||typeof s.token!=='string'||!s.token||s.token.length>4096||/[\x00-\x20\x7f]/.test(s.token))fail('AUTH_REQUIRED');
      return {wallet:s.wallet.toLowerCase(),token:s.token};
    }
    async function request(path,method='GET',body,maxResponseBytes=1048576){
      if(!enabled||disposed)fail('DISABLED');
      const start=session(),version=generation,controller=new AbortController();controllers.add(controller);
      let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ClientError('TIMEOUT'));},timeoutMs);});
      const bounded=promise=>Promise.race([promise,deadline]);
      const current=()=>{if(version!==generation||disposed)return false;try{const s=session();return s.wallet===start.wallet&&s.token===start.token;}catch{return false;}};
      try{
        const response=await bounded(fetcher(new URL(path,base).href,{method,headers:{Accept:'application/json',Authorization:'Bearer '+start.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}));
        if(!current())fail('STALE_CONTEXT');
        if(response.redirected)fail('UNEXPECTED_REDIRECT');
        if(response.status===401||response.status===403){invalidate();onUnauthorized(response.status);throw new ClientError('AUTH_REQUIRED',response.status);}
        if(!response.ok)throw new ClientError('REQUEST_FAILED',response.status);
        if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||''))fail('INVALID_RESPONSE');
        if(!response.body||typeof response.body.getReader!=='function')fail('INVALID_RESPONSE');
        const reader=response.body.getReader(),chunks=[];let bytes=0;
        try{while(true){if(!current())fail('STALE_CONTEXT');const part=await bounded(reader.read());if(!current())fail('STALE_CONTEXT');if(part.done)break;if(!(part.value instanceof Uint8Array))fail('INVALID_RESPONSE');bytes+=part.value.byteLength;if(bytes>maxResponseBytes){controller.abort();fail('RESPONSE_TOO_LARGE');}chunks.push(part.value);}}
        catch(error){try{const pending=reader.cancel();pending?.catch?.(()=>{});}catch{}throw error;}
        finally{try{reader.releaseLock();}catch{}}
        const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
        let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(joined);}catch{fail('INVALID_RESPONSE');}
        let data;try{data=JSON.parse(text);}catch{fail('INVALID_RESPONSE');}
        if(!data||typeof data!=='object'||Array.isArray(data))fail('INVALID_RESPONSE');
        return data;
      }catch(error){if(!current()&&!(error instanceof ClientError&&error.code==='AUTH_REQUIRED'))throw new ClientError('STALE_CONTEXT');if(error instanceof ClientError)throw error;throw new ClientError('NETWORK_FAILED');}
      finally{clearTimeout(timer);controllers.delete(controller);}
    }
    function watch(payload){
      if(!payload||Object.keys(payload).sort().join(',')!=='request_key,spec'||typeof payload.request_key!=='string'||!/^[A-Za-z0-9_.:@/-]{1,128}$/.test(payload.request_key))fail('INVALID_WATCH');
      const s=payload.spec,e=s?.entity,c=s?.condition;
      if(!s||Object.keys(s).sort().join(',')!=='condition,entity'||!e||Object.keys(e).sort().join(',')!=='identity,kind,network'||e.kind!=='market'||e.network!=='kraken'||!pairs.has(e.identity)||!c||Object.keys(c).sort().join(',')!=='field,operator,unit,value'||c.field!=='price'||!['gte','lte'].includes(c.operator)||c.unit!=='USD'||typeof c.value!=='number'||!Number.isFinite(c.value)||c.value<0||c.value>1e18)fail('INVALID_WATCH');
      return request('/v1/intelligence/watches','POST',payload);
    }
    function review(payload){
      if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).sort().join(',')!=='intent,records'||payload.intent!=='review_records'||!Array.isArray(payload.records)||payload.records.length<1||payload.records.length>8)fail('INVALID_REVIEW');
      const seen=new Set();
      for(const row of payload.records){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='product,record_id'||!['scanner','radar_signal','radar_candidate'].includes(row.product)||typeof row.record_id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(row.record_id))fail('INVALID_REVIEW');const key=row.product+':'+row.record_id;if(seen.has(key))fail('INVALID_REVIEW');seen.add(key);}
      const copy=JSON.parse(JSON.stringify(payload));if(new TextEncoder().encode(JSON.stringify(copy)).byteLength>4096)fail('INVALID_REVIEW');
      return request('/v1/intelligence/review','POST',copy,131072);
    }
    return Object.freeze({reviewRecords:review,createWatch:watch,getWatch:value=>request('/v1/intelligence/watches/'+id(value)),cancelWatch:value=>request('/v1/intelligence/watches/'+id(value)+'/cancel','POST'),getNotification:value=>request('/v1/intelligence/notifications/'+id(value)),acknowledgeNotification:value=>request('/v1/intelligence/notifications/'+id(value)+'/ack','POST'),listNotifications:({limit=20,beforeId}={})=>{if(!Number.isInteger(limit)||limit<1||limit>100)fail('INVALID_LIMIT');return request('/v1/intelligence/notifications?limit='+limit+(beforeId?'&before_id='+id(beforeId):''));},invalidate,dispose:()=>{disposed=true;invalidate();eventTarget?.removeEventListener('basedmoer:wallet',invalidate);}});
  }
  return Object.freeze({createClient,ClientError});
});
