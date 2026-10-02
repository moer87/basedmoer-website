(function(root){
  function create(state, request){
    let running=false, lastSuccess='';
    const signature=(c,s)=>JSON.stringify([c.wallet,c.token,Object.entries(s.scores||{}).sort()]);
    async function restore(){const c=state.context();if(!c.wallet||!c.token||c.preview)return false;const x=await request('/v1/ecosystem/academy/progress',{},c);if(!state.current(c))return false;const s=state.read(c);let changed=false;for(const [id,raw] of Object.entries(x.progress?.scores||{})){const score=Number(raw);if(!Number.isFinite(score)||score<70||score>100)continue;if(Number(s.scores[id]||0)<score){s.scores[id]=score;changed=true;}if(!s.completed[id]){s.completed[id]=true;changed=true;}}return changed&&state.write(s,c);}
    async function sync(manual=false){if(running)return {busy:true};const c=state.context();if(!c.wallet||!c.token||c.preview)return {unauthenticated:true};const s=state.read(c),sig=signature(c,s);if(!manual&&sig===lastSuccess)return {unchanged:true};running=true;let total=0,claimed=0,failed=0;try{for(const [id,raw] of Object.entries(s.scores||{})){if(!state.current(c))return {stale:true};const score=Number(raw);if(!Number.isFinite(score)||score<70||score>100)continue;total++;try{const x=await request('/v1/ecosystem/academy/claim',{method:'POST',body:JSON.stringify({module_id:id,score})},c);if(!state.current(c))return {stale:true};claimed+=Number(x.xp_awarded||0);}catch{failed++;}}if(!state.current(c))return {stale:true};if(!failed)lastSuccess=sig;return {total,claimed,failed};}finally{running=false;}}
    return {restore,sync};
  }
  if(typeof module==='object'&&module.exports)module.exports={create};else root.MoerAcademySync={create};
})(typeof window==='object'?window:globalThis);
