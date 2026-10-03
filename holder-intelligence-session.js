/* Explicit opt-in, in-memory holder login coordinator. Never mounted automatically. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MoerHolderSession=factory();})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  class SessionError extends Error{constructor(code,status){super(code);this.name='HolderSessionError';this.code=code;this.status=status;}}
  const fail=code=>{throw new SessionError(code);};
  function createSession({enabled=false,baseURL,allowedOrigins=[],fetch:fetcher,getWallet,signChallenge,eventTarget,now=Date.now,timeoutMs=60000,onChange=()=>{}}={}){
    let base,generation=0,verified=null,disposed=false;const controllers=new Set();
    if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)fail('INVALID_TIMEOUT');
    if(enabled){if(typeof fetcher!=='function'||typeof getWallet!=='function'||typeof signChallenge!=='function'||typeof now!=='function'||typeof eventTarget?.addEventListener!=='function'||typeof eventTarget?.removeEventListener!=='function')fail('INVALID_CONFIG');try{base=new URL(baseURL);}catch{fail('INVALID_CONFIG');}if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/'||!allowedOrigins.includes(base.origin))fail('UNTRUSTED_API');}
    function invalidate(){generation++;verified=null;for(const controller of controllers)controller.abort();controllers.clear();onChange();}
    eventTarget?.addEventListener('basedmoer:wallet',invalidate);
    function wallet(){const address=getWallet();if(typeof address!=='string'||!/^0x[a-f0-9]{40}$/i.test(address))fail('WALLET_REQUIRED');return address.toLowerCase();}
    function expiry(value,maxMs){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))fail('INVALID_RESPONSE');const at=Date.parse(value),clock=now();if(!Number.isFinite(at)||!Number.isFinite(clock)||at<=clock||at-clock>maxMs)fail('INVALID_RESPONSE');return at;}
    function getSession(){if(!enabled||disposed||!verified)return null;let address;try{address=wallet();}catch{invalidate();return null;}if(address!==verified.wallet||!Number.isFinite(now())||now()>=verified.expiresAt){invalidate();return null;}return {wallet:verified.wallet,token:verified.token,verified:true};}
    async function authenticate(){
      if(!enabled||disposed)fail('DISABLED');
      const address=wallet();invalidate();const version=generation,controller=new AbortController();controllers.add(controller);let timer,timedOut=false;
      const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;controller.abort();reject(new SessionError('TIMEOUT'));},timeoutMs);});
      const current=()=>{if(disposed||version!==generation)return false;try{return wallet()===address;}catch{return false;}};
      const check=()=>{if(!current())fail('STALE_CONTEXT');if(timedOut)fail('TIMEOUT');};
      const bounded=promise=>Promise.race([promise,deadline]);
      async function post(path,payload){
        check();const response=await bounded(fetcher(new URL(path,base).href,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}));check();
        if(response.redirected)fail('UNEXPECTED_REDIRECT');
        if(!response.ok)throw new SessionError(response.status===401||response.status===403?'AUTH_REQUIRED':'REQUEST_FAILED',response.status);
        if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||'')||!response.body?.getReader)fail('INVALID_RESPONSE');
        const reader=response.body.getReader(),chunks=[];let bytes=0;
        try{while(true){check();const part=await bounded(reader.read());check();if(part.done)break;if(!(part.value instanceof Uint8Array))fail('INVALID_RESPONSE');bytes+=part.value.byteLength;if(bytes>65536){controller.abort();fail('RESPONSE_TOO_LARGE');}chunks.push(part.value);}}
        catch(error){try{reader.cancel()?.catch?.(()=>{});}catch{}throw error;}finally{try{reader.releaseLock();}catch{}}
        const joined=new Uint8Array(bytes);let offset=0;for(const part of chunks){joined.set(part,offset);offset+=part.byteLength;}
        let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));}catch{fail('INVALID_RESPONSE');}if(!data||typeof data!=='object'||Array.isArray(data))fail('INVALID_RESPONSE');return data;
      }
      try{
        const challenge=await post('/v1/agent/auth/challenge',{wallet_address:address});check();
        if(challenge.success!==true||typeof challenge.wallet_address!=='string'||challenge.wallet_address.toLowerCase()!==address||!Number.isInteger(challenge.holder_balance)||challenge.holder_balance<1||typeof challenge.message!=='string'||challenge.message.length>4096)fail('INVALID_RESPONSE');
        const challengeExpiry=expiry(challenge.expires_at,12*60000);
        // Exact known login template prevents this flow from signing arbitrary instructions.
        const prefix='Based Moer — Moe Agent Login\n\nWallet: '+address+'\nChain: Base (8453)\nNonce: ';
        const tail='\nExpires: '+challenge.expires_at+'\n\nSigning proves wallet ownership. It does not authorize a trade or transfer funds.';
        if(!challenge.message.startsWith(prefix)||!challenge.message.endsWith(tail)||!/^[a-f0-9]{32}$/.test(challenge.message.slice(prefix.length,-tail.length)))fail('INVALID_CHALLENGE');
        check();const signed=await bounded(signChallenge(challenge.message,address));check();if(now()>=challengeExpiry)fail('CHALLENGE_EXPIRED');
        const signature=typeof signed==='string'?signed:signed?.signature;if(typeof signature!=='string'||!/^0x[0-9a-f]{130}$/i.test(signature))fail('INVALID_SIGNATURE');
        const result=await post('/v1/agent/auth/verify',{wallet_address:address,signature});check();
        if(result.success!==true||typeof result.account?.wallet_address!=='string'||result.account.wallet_address.toLowerCase()!==address||!Number.isInteger(result.holder_balance)||result.holder_balance<1||typeof result.session_token!=='string'||!/^[A-Za-z0-9_-]{32,4096}$/.test(result.session_token))fail('INVALID_RESPONSE');
        const expiresAt=expiry(result.expires_at,25*3600000);check();verified={wallet:address,token:result.session_token,expiresAt};onChange();return getSession();
      }catch(error){if(!current())throw new SessionError('STALE_CONTEXT');verified=null;onChange();if(error instanceof SessionError)throw error;throw new SessionError('LOGIN_FAILED');}
      finally{clearTimeout(timer);controllers.delete(controller);}
    }
    return Object.freeze({authenticate,getSession,invalidate,onUnauthorized:()=>invalidate(),dispose:()=>{disposed=true;invalidate();eventTarget?.removeEventListener('basedmoer:wallet',invalidate);}});
  }
  return Object.freeze({createSession,SessionError});
});
