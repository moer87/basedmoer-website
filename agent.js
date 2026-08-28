(function(){
  const API='https://moe-ai-production.up.railway.app/v1/agent';
  const tokenKey='moeAgentSession';
  const $=id=>document.getElementById(id);
  const money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4});
  function wallet(){return sessionStorage.getItem('basedMoerWallet')||''}
  function token(){return sessionStorage.getItem(tokenKey)||''}
  function headers(){const t=token();return t?{'Authorization':'Bearer '+t,'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
  async function json(url,opts={}){const r=await fetch(url,{...opts,headers:{...headers(),...(opts.headers||{})}});const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.detail||x.error||('HTTP '+r.status));return x}
  function state(text,bad=false){const e=$('agentMessage');if(e){e.textContent=text;e.style.color=bad?'#ff8d9b':'#8190ad'}}
  function renderAccount(a,positions=[]){
    if(!a)return;
    $('agentMode').textContent=a.mode||'PAPER';
    $('agentState').textContent=a.enabled?'RUNNING':'STOPPED';
    $('agentCash').textContent='$'+money(a.paper_cash_balance);
    $('agentPnl').textContent=(Number(a.realized_pnl||0)>=0?'+':'')+'$'+money(a.realized_pnl);
    $('agentOpen').textContent=positions.filter(p=>p.status==='OPEN').length;
    $('paperStart').value=Number(a.paper_start_balance||10);
    $('maxAllocation').value=Number(a.max_total_allocation||10);
    $('maxPosition').value=Number(a.max_position_size||2);
    $('maxOpen').value=Number(a.max_open_positions||2);
    $('maxDailyLoss').value=Number(a.max_daily_loss||2);
    $('minConfidence').value=Number(a.min_signal_confidence||80);
    $('agentStart').disabled=!!a.enabled;
    $('agentStop').disabled=!a.enabled;
    $('agentSave').disabled=!!a.enabled;
    const area=$('agentPositions');
    if(area){
      area.innerHTML=positions.length?positions.slice(0,20).map(p=>`<div class="agent-pos"><strong>${p.symbol}</strong><span>${p.status}</span><span>$${money(p.notional)}</span><span>${Number(p.pnl_usd||0)>=0?'+':''}$${money(p.pnl_usd)}</span></div>`).join(''):'<div class="agent-empty">No paper positions yet.</div>';
    }
  }
  async function load(){
    if(!wallet()){state('Connect your holder wallet first.',true);return}
    if(!token()){state('Authenticate Moe Agent with a wallet signature. This does not authorize a transaction.');$('agentAuth').hidden=false;return}
    try{
      const x=await json(API+'/me');
      $('agentAuth').hidden=true;
      $('agentPanel').hidden=false;
      renderAccount(x.account,x.positions||[]);
      state('Moe Agent paper engine connected. Live execution is disabled.');
    }catch(e){sessionStorage.removeItem(tokenKey);$('agentAuth').hidden=false;$('agentPanel').hidden=true;state(e.message,true)}
  }
  async function authenticate(){
    const w=wallet();if(!w){state('Connect your holder wallet first.',true);return}
    if(!window.ethereum){state('No compatible wallet provider detected.',true);return}
    try{
      state('Creating secure holder challenge...');
      const c=await json(API+'/auth/challenge',{method:'POST',body:JSON.stringify({wallet_address:w})});
      const sig=await ethereum.request({method:'personal_sign',params:[c.message,w]});
      const v=await json(API+'/auth/verify',{method:'POST',body:JSON.stringify({wallet_address:w,signature:sig})});
      sessionStorage.setItem(tokenKey,v.session_token);
      state('Authenticated.');
      await load();
    }catch(e){state(e.message,true)}
  }
  async function save(){
    try{
      const body={paper_start_balance:Number($('paperStart').value),max_total_allocation:Number($('maxAllocation').value),max_position_size:Number($('maxPosition').value),max_open_positions:Number($('maxOpen').value),max_daily_loss:Number($('maxDailyLoss').value),min_signal_confidence:Number($('minConfidence').value)};
      const x=await json(API+'/config',{method:'POST',body:JSON.stringify(body)});renderAccount(x.account,[]);state('Paper risk settings saved.')
    }catch(e){state(e.message,true)}
  }
  async function toggle(enabled){
    try{const x=await json(API+'/toggle',{method:'POST',body:JSON.stringify({enabled})});state(enabled?'Moe Agent paper mode started.':'Moe Agent stopped.');await load()}catch(e){state(e.message,true)}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('agentLogin')?.addEventListener('click',authenticate);$('agentSave')?.addEventListener('click',save);$('agentStart')?.addEventListener('click',()=>toggle(true));$('agentStop')?.addEventListener('click',()=>toggle(false));load();setInterval(()=>{if(token())load()},30000)
  });
  window.addEventListener('basedmoer:wallet',()=>{sessionStorage.removeItem(tokenKey);setTimeout(load,100)});
})();
