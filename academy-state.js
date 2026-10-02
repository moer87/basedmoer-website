(function(root){
  function create(storage, session, preview=false){
    const empty=()=>({completed:{},scores:{}});
    function context(){const wallet=String(session.getItem('basedMoerWallet')||'').toLowerCase();return {wallet:/^0x[a-f0-9]{40}$/.test(wallet)?wallet:'',token:session.getItem('moeAgentSession')||'',preview};}
    function key(c=context()){return 'moeAcademyV4:'+ (c.preview?'preview':c.wallet||'anonymous');}
    function current(c){const n=context();return c.wallet===n.wallet&&c.token===n.token&&c.preview===n.preview;}
    function read(c=context()){try{let raw=storage.getItem(key(c));if(!raw&&!c.wallet&&!c.preview)raw=storage.getItem('moeAcademyV3')||storage.getItem('moeAcademyV2');const s=JSON.parse(raw||'null');return s&&typeof s==='object'?{completed:s.completed||{},scores:s.scores||{}}:empty();}catch{return empty();}}
    function write(s,c=context()){if(!current(c))return false;storage.setItem(key(c),JSON.stringify(s));return true;}
    return {context,key,current,read,write};
  }
  if(typeof module==='object'&&module.exports)module.exports={create};
  else root.MoerAcademyState=create(root.localStorage,root.sessionStorage,root.location.hostname.endsWith('.vercel.app')&&new URLSearchParams(root.location.search).get('preview')==='holder');
})(typeof window==='object'?window:globalThis);
