(function(){
const $=id=>document.getElementById(id),cabinet=$('cabinet'),terminal=$('terminal'),pull=$('pullBtn'),ret=$('returnBtn'),reward=$('rewardText'),status=$('status'),mode=$('mode'),rewardHud=$('rewardHud'),buffHud=$('buffHud');
const reels=[$('r1'),$('r2'),$('r3')];
const symbols=['RAPID','SHIELD','TRI-BEAM','XP','COSMETIC','WARP'];
const outcomes=[
  {reels:['RAPID','RAPID','RAPID'],name:'RAPID OVERDRIVE',buff:'12 SEC RAPID',text:'Temporary rapid-fire overdrive loaded for the return to Sector 01.'},
  {reels:['SHIELD','SHIELD','SHIELD'],name:'AEGIS CHARGE',buff:'+2 SHIELDS',text:'The anomaly reinforces the ship with two temporary shield charges.'},
  {reels:['TRI-BEAM','TRI-BEAM','TRI-BEAM'],name:'PRISM BURST',buff:'TRI-BEAM',text:'A temporary tri-beam weapon modifier is armed for the resumed run.'},
  {reels:['XP','XP','XP'],name:'MOER XP CACHE',buff:'XP DROP',text:'In the real holder build this could become a capped server-validated XP event.'},
  {reels:['COSMETIC','COSMETIC','COSMETIC'],name:'RARE COSMETIC',buff:'PASSPORT DROP',text:'A rare cosmetic fragment appears. Demo only: nothing is saved to Passport.'},
  {reels:['WARP','WARP','WARP'],name:'WARP JACKPOT',buff:'ALL SYSTEMS+',text:'Rare event result: temporary weapon, shield and score boost on sector return.'}
];
let spinning=false,complete=false;
function makeStars(){const s=$('space');for(let i=0;i<65;i++){const n=document.createElement('i');n.className='star';n.style.left=(Math.random()*100)+'%';n.style.top=(Math.random()*100)+'%';n.style.animationDuration=(2.4+Math.random()*5)+'s';n.style.animationDelay=(-Math.random()*5)+'s';s.appendChild(n)}}
function reveal(){cabinet.classList.add('glitch');mode.textContent='SIGNAL LOST';status.textContent='WARNING • LOCAL SPACE DISTORTION DETECTED';setTimeout(()=>{terminal.classList.add('active');mode.textContent='ANOMALY DROP';status.textContent='PORTAL LOCKED • REWARD CORE AVAILABLE'},950)}
function spin(){if(spinning||complete)return;spinning=true;pull.disabled=true;reward.textContent='DECODING ANOMALY CORE...';reels.forEach(r=>r.classList.add('spin'));let ticks=0;const timer=setInterval(()=>{ticks++;reels.forEach(r=>r.textContent=symbols[Math.floor(Math.random()*symbols.length)]);if(ticks>=20){clearInterval(timer);const chosen=outcomes[Math.floor(Math.random()*outcomes.length)];reels.forEach((r,i)=>{r.classList.remove('spin');r.textContent=chosen.reels[i]});reward.textContent=chosen.name+' — '+chosen.text;rewardHud.textContent=chosen.name;buffHud.textContent=chosen.buff;ret.disabled=false;complete=true;spinning=false;status.textContent='REWARD CORE STABLE • RETURN VECTOR READY'}},90)}
function returnSector(){terminal.classList.remove('active');cabinet.classList.remove('glitch');mode.textContent='SECTOR RUN';status.textContent='RETURNED TO SECTOR 01 • TEMPORARY EVENT BUFF ACTIVE';ret.disabled=true;pull.disabled=false;pull.textContent='EVENT COMPLETE';setTimeout(()=>{status.textContent='CREATOR PREVIEW COMPLETE • RELOAD TO EXPERIENCE AGAIN'},700)}
pull.addEventListener('click',spin);ret.addEventListener('click',returnSector);makeStars();setTimeout(reveal,1200);
})();