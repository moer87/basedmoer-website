(function(){
  const API='https://moe-ai-production.up.railway.app';
  const preview=new URLSearchParams(location.search).get('preview')==='holder';
  const token=()=>sessionStorage.getItem('moeAgentSession')||'';
  function esc(v){return String(v??'—').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
  function pct(v){if(v==null)return '—';const n=Number(v);return `${n>0?'+':''}${n.toFixed(2)}%`}
  function delta(v){if(v==null)return '—';const n=Number(v);return `${n>0?'+':''}${n.toFixed(1)}`}
  async function req(){
    const t=token();
    const r=await fetch(API+'/v1/radar/weekly?min_score=40&limit=20',{cache:'no-store',headers:t?{Authorization:'Bearer '+t}:{}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||j.error||`HTTP ${r.status}`);
    return j;
  }
  function demo(){return {data:[
    {chain:'Base',symbol:'DEMO-A',stage:'EARLY_SETUP',radar_score:78,score_delta_7d:9,price_change_7d_pct:6.2,liquidity_change_7d_pct:11.3,market_cap_change_7d_pct:5.7,weekly_status:'IMPROVING',risk_flags:[],observations_7d:26,security_validated:false,holder_intelligence_validated:false},
    {chain:'Solana',symbol:'DEMO-B',stage:'COMPRESSION',radar_score:66,score_delta_7d:2,price_change_7d_pct:-3.4,liquidity_change_7d_pct:4.1,market_cap_change_7d_pct:-2.8,weekly_status:'STABLE',risk_flags:['discovery_only'],observations_7d:19,security_validated:false,holder_intelligence_validated:false},
    {chain:'Base',symbol:'DEMO-C',stage:'REJECT',radar_score:42,score_delta_7d:-14,price_change_7d_pct:-21.2,liquidity_change_7d_pct:-30.5,market_cap_change_7d_pct:-19.0,weekly_status:'REJECTED',risk_flags:['example_security_flag'],observations_7d:31,security_validated:false,holder_intelligence_validated:false}
  ]}}
  function row(x){const flags=(x.risk_flags||[]).slice(0,2).join(', ')||'none';return `<div class="radar-week-row"><div><strong>${esc(x.symbol)}</strong><span>${esc(x.chain||x.chain_id)} • ${esc(x.stage)}</span></div><div><b>${esc(x.radar_score)}</b><span>${delta(x.score_delta_7d)} score</span></div><div><b>${pct(x.price_change_7d_pct)}</b><span>price 7d</span></div><div><b>${pct(x.liquidity_change_7d_pct)}</b><span>liquidity 7d</span></div><div><b>${esc(x.weekly_status)}</b><span>${esc(x.observations_7d)} observations</span></div><div><b>${x.security_validated?'SECURITY ✓':'SECURITY ?'}</b><span>${esc(flags)}</span></div></div>`}
  function shell(){
    if(document.getElementById('weeklyRadarPanel'))return;
    const agent=document.querySelector('.agent-shell'); if(!agent)return;
    const panel=document.createElement('section');panel.id='weeklyRadarPanel';panel.className='weekly-radar-shell';
    panel.innerHTML=`<div class="weekly-radar-head"><div><div class="section-label">MOE TOKEN RADAR • 7-DAY TRACKER</div><h2>WEEKLY SIGNAL DRIFT.</h2><p>Tracks how discovery candidates change across seven days: Radar score, price, liquidity, market cap, structure and risk flags. This is a research tracker, not a trade recommendation or execution feed.</p></div><button class="button secondary" id="weeklyRadarRefresh">REFRESH 7D</button></div><div class="weekly-radar-warning" id="weeklyRadarWarning">DISCOVERY ONLY • EXECUTION FEED DISABLED</div><div class="weekly-radar-grid-head"><span>TOKEN</span><span>RADAR</span><span>PRICE</span><span>LIQUIDITY</span><span>WEEKLY STATE</span><span>RISK / VALIDATION</span></div><div id="weeklyRadarRows"><div class="loading">Loading weekly Radar history…</div></div>`;
    agent.parentNode.insertBefore(panel,agent);
    const style=document.createElement('style');style.textContent=`.weekly-radar-shell{margin:24px 0;padding:24px;border:1px solid #342f68;border-radius:22px;background:radial-gradient(circle at 15% 0,rgba(0,180,255,.11),transparent 34%),radial-gradient(circle at 85% 0,rgba(152,61,255,.12),transparent 32%),#070b14;overflow:hidden}.weekly-radar-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.weekly-radar-head h2{margin:6px 0}.weekly-radar-head p{margin:0;max-width:780px;color:#8794b0;line-height:1.6}.weekly-radar-warning{margin:16px 0;padding:9px 12px;border:1px solid #314a73;background:#081426;color:#7fcfff;font-size:9px;font-weight:1000;letter-spacing:.08em}.weekly-radar-grid-head,.radar-week-row{display:grid;grid-template-columns:1.15fr .7fr .75fr .8fr 1fr 1.2fr;gap:10px;align-items:center}.weekly-radar-grid-head{padding:9px 12px;color:#667897;font-size:8px;font-weight:1000;border-bottom:1px solid #25314a}.radar-week-row{padding:13px 12px;border-bottom:1px solid #1b263b;background:linear-gradient(90deg,rgba(0,82,255,.035),rgba(105,40,180,.025));font-size:11px}.radar-week-row strong,.radar-week-row b{display:block;color:#dbe7ff}.radar-week-row span{display:block;margin-top:4px;color:#71819e;font-size:9px;white-space:normal}.radar-preview-note{padding:12px;color:#c9b7ff;font-size:10px;border:1px dashed #59447a;background:#140d20}@media(max-width:900px){.weekly-radar-grid-head{display:none}.radar-week-row{grid-template-columns:1fr 1fr 1fr}.weekly-radar-head{flex-direction:column}}@media(max-width:560px){.radar-week-row{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(style);
    document.getElementById('weeklyRadarRefresh').onclick=load;
  }
  async function load(){const area=document.getElementById('weeklyRadarRows');if(!area)return;area.innerHTML='<div class="loading">Scanning seven-day history…</div>';try{const x=preview&&!token()?demo():await req();const data=x.data||[];area.innerHTML=(preview&&!token()?'<div class="radar-preview-note">CREATOR PREVIEW: sample rows only. Real weekly data requires a signed holder session.</div>':'')+(data.length?data.map(row).join(''):'<div class="loading">No seven-day candidates yet.</div>')}catch(e){area.innerHTML=`<div class="loading">WEEKLY RADAR UNAVAILABLE — ${esc(e.message)}</div>`}}
  document.addEventListener('DOMContentLoaded',()=>{if(!location.pathname.startsWith('/live/'))return;shell();setTimeout(load,600)});
})();
