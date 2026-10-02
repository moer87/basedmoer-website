(function(){
const API='https://moe-ai-production.up.railway.app';
const state=window.MoerAcademyState;
async function req(path,opts={},context){const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',Authorization:'Bearer '+context.token}}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||j.error||('HTTP '+r.status));return j}
const engine=window.MoerAcademySync.create(state,req);
function msg(text,bad=false){const e=document.getElementById('academyXpMsg');if(e){e.textContent=text;e.style.color=bad?'#ff8d9b':'#8190ad'}}
function addPanel(){const d=document.querySelector('.dashboard .container');if(!d||document.getElementById('academyXpPanel'))return;const p=document.createElement('div');p.id='academyXpPanel';p.className='card moer-panel-purple';p.style.cssText='padding:18px;margin-top:14px';p.innerHTML='<div class="section-label">ACADEMY → PASSPORT</div><h3 style="margin:8px 0">Learning progress follows your wallet</h3><p style="color:var(--muted);margin:0 0 12px">Passed modules sync automatically to your Moerverse Passport. A pass earns 10 XP once; a 90%+ score earns 15 XP once. Returning with the same holder wallet restores server-synced completed modules.</p><button class="button secondary" id="academyXpSync">SYNC NOW</button><span id="academyXpMsg" style="margin-left:10px;font-size:11px;color:#8190ad"></span>';d.appendChild(p);document.getElementById('academyXpSync').onclick=()=>sync(true)}
async function restore(){try{if(await engine.restore()){msg('Restored completed modules from your Passport.');window.dispatchEvent(new CustomEvent('moer:academy-restored'));}}catch(e){console.warn('Academy restore unavailable:',e)}}
async function sync(manual=false){const x=await engine.sync(manual);if(x.stale||x.busy||x.unchanged)return;if(x.unauthenticated){if(manual)msg('Authenticate your Passport first. Anonymous progress stays separate.',true);return}if(manual||x.claimed||x.failed)msg(`Passport synced: ${x.total} passed modules${x.claimed?' • +'+x.claimed+' XP':''}${x.failed?' • '+x.failed+' pending retry':''}`,!!x.failed)}
async function boot(){addPanel();await restore();await sync(false);setInterval(()=>sync(false),4000)}
function initialize(){if(location.pathname.startsWith('/academy/'))setTimeout(boot,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
window.addEventListener('basedmoer:wallet',()=>setTimeout(async()=>{await restore();await sync(false)},250));
})();
