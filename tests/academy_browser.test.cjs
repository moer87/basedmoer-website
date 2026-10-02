const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('browser scripts expose shared state and sync with no cross-wallet restore',async()=>{
  const values=new Map(),sessions=new Map();
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const window={localStorage:storage,sessionStorage:{getItem:k=>sessions.get(k)||null},location:{hostname:'basedmoer.com',search:''}};
  const context={window,URLSearchParams};
  for(const file of ['academy-state.js','academy-sync.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const state=window.MoerAcademyState;
  state.write({completed:{a:true},scores:{a:100}});
  sessions.set('basedMoerWallet','0x'+'1'.repeat(40));sessions.set('moeAgentSession','session');
  let count=0;const engine=window.MoerAcademySync.create(state,async()=>{count++;return {}});
  await engine.sync();assert.equal(count,0,'anonymous results must not be submitted after login');
});
test('Academy and Passport load state before consumers',()=>{
  for(const file of ['academy/index.html','profile/index.html']){
    const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    assert.ok(html.indexOf('/academy-state.js')<html.indexOf('/shared.js'));
    assert.ok(html.indexOf('/academy-sync.js')<html.indexOf('/shared.js'));
  }
});
