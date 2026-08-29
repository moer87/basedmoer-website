(function(){
  const API='https://moe-ai-production.up.railway.app';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  const W=canvas.width,H=canvas.height;
  const keys={};
  let running=false,score=0,lives=3,startAt=0,runToken='',last=0,enemyTimer=0,shotTimer=0;
  let player={x:80,y:H/2,w:28,h:18,speed:250};
  let shots=[],enemies=[],particles=[],stars=[];
  const $=id=>document.getElementById(id);
  const session=()=>sessionStorage.getItem('moeAgentSession')||'';
  const wallet=()=>sessionStorage.getItem('basedMoerWallet')||'';

  for(let i=0;i<90;i++)stars.push({x:Math.random()*W,y:Math.random()*H,s:1+Math.floor(Math.random()*3),v:20+Math.random()*55});

  async function req(path,opts={}){
    const t=session();
    const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{}),...(opts.headers||{})}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||j.error||('HTTP '+r.status));
    return j;
  }
  async function authenticate(){
    const w=wallet();
    if(!w||!window.ethereum)throw new Error('Connect your holder wallet first.');
    const c=await req('/v1/agent/auth/challenge',{method:'POST',body:JSON.stringify({wallet_address:w})});
    const sig=await ethereum.request({method:'personal_sign',params:[c.message,w]});
    const v=await req('/v1/agent/auth/verify',{method:'POST',body:JSON.stringify({wallet_address:w,signature:sig})});
    sessionStorage.setItem('moeAgentSession',v.session_token);
  }
  function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
  function ship(x,y){
    rect(x,y+6,22,6,'#5eb8ff');rect(x+6,y+2,14,14,'#1a65d8');rect(x+13,y,8,18,'#bfeeff');rect(x+21,y+6,7,6,'#ffffff');rect(x-6,y+7,7,4,'#795dff');rect(x-10,y+8,4,2,'#ff72d0');
  }
  function enemy(e){
    const c=e.type===2?'#ff6e8d':'#f3a84b';rect(e.x,e.y+4,e.w,10,c);rect(e.x+6,e.y,e.w-12,18,e.type===2?'#912c66':'#ae4c35');rect(e.x-5,e.y+7,6,4,'#ffd27d');rect(e.x+e.w,e.y+6,5,6,'#eaf5ff');
  }
  function explosion(x,y,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:.45+Math.random()*.5,size:2+Math.floor(Math.random()*4)})}
  function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function reset(){score=0;lives=3;shots=[];enemies=[];particles=[];player.x=80;player.y=H/2;startAt=performance.now();last=startAt;enemyTimer=0;shotTimer=0;$('score').textContent='0';$('lives').textContent='3';$('time').textContent='60';$('runXp').textContent='0'}
  async function start(){
    try{
      $('status').textContent='Preparing verified run...';
      if(!session())await authenticate();
      const r=await req('/v1/progression/arcade/start',{method:'POST',body:'{}'});
      runToken=r.run_token;reset();running=true;$('overlay').hidden=true;$('status').textContent='Verified run active.';requestAnimationFrame(loop);
    }catch(e){$('status').textContent=e.message;$('overlayTitle').textContent='AUTH REQUIRED';$('overlayText').textContent=e.message;$('overlay').hidden=false}
  }
  function shoot(){if(shotTimer>0)return;shots.push({x:player.x+28,y:player.y+8,w:12,h:3,v:520});shotTimer=.16}
  function spawn(){const type=Math.random()<.22?2:1,en={x:W+35,y:28+Math.random()*(H-70),w:type===2?38:30,h:type===2?24:18,v:(type===2?125:155)+Math.random()*75,type,hp:type===2?2:1};enemies.push(en)}
  function update(dt){
    stars.forEach(s=>{s.x-=s.v*dt;if(s.x<0){s.x=W;s.y=Math.random()*H}});
    const dx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0),dy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);player.x=Math.max(12,Math.min(W-50,player.x+dx*player.speed*dt));player.y=Math.max(12,Math.min(H-34,player.y+dy*player.speed*dt));if(keys.Space)shoot();
    shotTimer=Math.max(0,shotTimer-dt);enemyTimer-=dt;if(enemyTimer<=0){spawn();enemyTimer=Math.max(.32,.8-(performance.now()-startAt)/120000)}
    shots.forEach(s=>s.x+=s.v*dt);shots=shots.filter(s=>s.x<W+20);
    enemies.forEach(e=>e.x-=e.v*dt);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
    for(const s of shots){for(const e of enemies){if(!s.dead&&!e.dead&&hit(s,e)){s.dead=true;e.hp--;explosion(s.x,s.y,4);if(e.hp<=0){e.dead=true;score+=e.type===2?350:150;explosion(e.x+e.w/2,e.y+e.h/2,e.type===2?18:10)}}}}
    shots=shots.filter(s=>!s.dead);enemies=enemies.filter(e=>!e.dead);
    for(const e of enemies){if(hit(player,e)){e.dead=true;lives--;explosion(player.x+15,player.y+9,18);$('lives').textContent=lives;if(lives<=0){finish();return}}else if(e.x<-50){e.dead=true}}
    enemies=enemies.filter(e=>!e.dead);
    $('score').textContent=score;
    const elapsed=(performance.now()-startAt)/1000,remain=Math.max(0,60-Math.floor(elapsed));$('time').textContent=remain;$('runXp').textContent=Math.min(25,Math.floor(score/1000));if(elapsed>=60)finish();
  }
  function draw(){
    rect(0,0,W,H,'#02050c');stars.forEach(s=>rect(s.x,s.y,s.s,s.s,s.s>2?'#7aa7ff':'#304466'));ctx.strokeStyle='#0f203a';ctx.lineWidth=1;for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.globalAlpha=.22;ctx.strokeStyle='#1c63ff';ctx.beginPath();ctx.arc(W*.7,H*.5,120,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(W*.7,H*.5,200,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    ship(player.x,player.y);shots.forEach(s=>{rect(s.x,s.y,s.w,s.h,'#7cf9ff');rect(s.x+s.w,s.y+1,5,1,'#fff')});enemies.forEach(enemy);particles.forEach(p=>rect(p.x,p.y,p.size,p.size,p.life>.5?'#ffe26a':'#ff6f61'));
  }
  async function finish(){
    if(!running)return;running=false;draw();const duration=Math.max(1,Math.round((performance.now()-startAt)/1000));$('overlay').hidden=false;$('overlayTitle').textContent='RUN COMPLETE';$('overlayText').textContent=`Score ${score.toLocaleString()} • validating MOER XP...`;$('startBtn').textContent='PLAY AGAIN';
    try{const r=await req('/v1/progression/arcade/submit',{method:'POST',body:JSON.stringify({run_token:runToken,score,duration_seconds:duration})});$('runXp').textContent=r.xp_awarded;$('overlayText').textContent=`Score ${score.toLocaleString()} • +${r.xp_awarded} MOER XP • ${r.daily_arcade_xp_remaining} daily Arcade XP remaining.`;$('status').textContent='Run validated and progression synced.'}catch(e){$('overlayText').textContent=`Score ${score.toLocaleString()} • XP validation failed: ${e.message}`;$('status').textContent='No XP was awarded for this run.'}
  }
  function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw();if(running)requestAnimationFrame(loop)}
  window.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});window.addEventListener('keyup',e=>keys[e.code]=false);
  document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=false))});
  $('startBtn').addEventListener('click',start);draw();
})();