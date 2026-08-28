(function(){
  const API='https://moe-ai-production.up.railway.app/v1/agent';
  const EXEC='https://moe-ai-production.up.railway.app/v1/execution';
  const tokenKey='moeAgentSession';
  const $=id=>document.getElementById(id);
  const money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4});
  function wallet(){return sessionStorage.getItem('basedMoerWallet')||''}
  function token(){return sessionStorage.getItem(tokenKey)||''}
  function headers(){const t=token();return t?{'Authorization':'Bearer '+t,'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
  async function json(url,opts={}){const r=await fetch(url,{...opts,headers:{...headers(),...(opts.headers||{})}});const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.detail||x.error||('HTTP '+r.status));return x}
  function state(text,bad=false){const e=$('agentMessage');if(e){e.textContent=text;e.style.color=bad?'#ff8d9b':'#8190ad'}}
  function ensureExecutionPanel(){
    if($('baseExecPanel'))return;
    const panel=$('agentPanel');if(!panel)return;
    const wrap=document.createElement('section');
    wrap.id='baseExecPanel';
    wrap.style.cssText='margin-top:18px;padding:16px;border:1px solid #263149;border-radius:13px;background:#080d15';
    wrap.innerHTML=`
      <div style="font-size:10px;font-weight:900;color:#71809e;margin-bottom:8px">BASE EXECUTION READINESS</div>
      <div id="baseExecStatus" style="font-size:13px;color:#9aa8c4;line-height:1.6">Checking Base shadow routes...</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <button id="baseExecCheck" class="button secondary" type="button">CHECK BASE ROUTES</button>
        <button id="basePermissionPlan" class="button secondary" type="button">PREPARE $10 PERMISSION</button>
      </div>
      <div id="basePermissionStatus" style="margin-top:10px;font-size:12px;color:#7f8da9;line-height:1.6">No live Spend Permission will be requested until the Moe spender contract passes security gates and is deployed. Signing and revocation will use the official Base Account SDK bundled into the site, not a third-party CDN.</div>`;
    panel.appendChild(wrap);
    $('baseExecCheck')?.addEventListener('click',checkExecutionHealth);
    $('basePermissionPlan')?.addEventListener('click',preparePermission);
  }
  async function checkExecutionHealth(){
    const e=$('baseExecStatus');if(e)e.textContent='Checking Base mainnet routes...';
    try{
      const x=await json(EXEC+'/health');
      const eth=x.checks?.ETHUSDT,btx=x.checks?.BTCUSDT;
      if(e)e.textContent=`Base ${x.chain_id||8453}: ETH route ${eth?.ok?'OK':'NOT READY'} · BTC/cbBTC route ${btx?.ok?'OK':'NOT READY'} · mode ${x.mode||'SHADOW'}.`;
    }catch(err){if(e)e.textContent='Base execution health unavailable: '+err.message}
  }
  async function preparePermission(){
    const e=$('basePermissionStatus');if(e)e.textContent='Preparing bounded Base USDC permission plan...';
    try{
      const x=await json(EXEC+'/permission-plan',{method:'POST',body:JSON.stringify({allowance_usd:10,period_days:30})});
      if(!x.ready){if(e)e.textContent='Live permission remains locked: '+(x.message||x.reason||'spender not deployed');return}
      if(e)e.textContent='Permission plan is ready for $10 USDC, but signing is intentionally disabled until the deployed spender address and final contract audit are verified.';
    }catch(err){if(e)e.textContent='Permission planning failed safely: '+err.message}
  }
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
      ensureExecutionPanel();
      renderAccount(x.account,x.positions||[]);
      state('Moe Agent shadow engine connected. Live fund execution remains locked.');
      checkExecutionHealth();
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
    try{await json(API+'/toggle',{method:'POST',body:JSON.stringify({enabled})});state(enabled?'Moe Agent shadow mode started.':'Moe Agent stopped.');await load()}catch(e){state(e.message,true)}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('agentLogin')?.addEventListener('click',authenticate);$('agentSave')?.addEventListener('click',save);$('agentStart')?.addEventListener('click',()=>toggle(true));$('agentStop')?.addEventListener('click',()=>toggle(false));load();setInterval(()=>{if(token())load()},30000)
  });
  window.addEventListener('basedmoer:wallet',()=>{sessionStorage.removeItem(tokenKey);setTimeout(load,100)});
})();
