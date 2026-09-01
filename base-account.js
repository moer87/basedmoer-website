import { createBaseAccountSDK } from 'https://cdn.jsdelivr.net/npm/@base-org/account@2.5.10/+esm';
import {
  fetchPermission,
  getPermissionStatus,
  requestRevoke,
  requestSpendPermission,
} from 'https://cdn.jsdelivr.net/npm/@base-org/account@2.5.10/spend-permission/+esm';

const EXEC='https://moe-ai-production.up.railway.app/v1/execution';
const SESSION_KEY='moeAgentSession';
const PERMISSION_KEY='moeBasePermission';
const BASE_CHAIN_ID=8453;

const sdk=createBaseAccountSDK({
  appName:'Based Moer',
  appLogoUrl:new URL('/assets/based-moer-logo.jpg',window.location.origin).href,
  appChainIds:[BASE_CHAIN_ID],
});
const provider=sdk.getProvider();

function token(){return sessionStorage.getItem(SESSION_KEY)||''}
function wallet(){return (sessionStorage.getItem('basedMoerWallet')||'').toLowerCase()}
function message(text,bad=false){
  const el=document.getElementById('basePermissionStatus');
  if(el){el.textContent=text;el.style.color=bad?'#ff8d9b':'#7f8da9'}
}
function jsonSafe(value){
  if(typeof value==='bigint')return value.toString();
  if(value instanceof Date)return value.toISOString();
  if(Array.isArray(value))return value.map(jsonSafe);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,jsonSafe(v)]));
  return value;
}
async function api(path,opts={}){
  const t=token();
  if(!t)throw new Error('Authenticate Moer Agent first.');
  const r=await fetch(EXEC+path,{
    ...opts,
    headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json',...(opts.headers||{})},
  });
  const x=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(x.detail||x.error||('HTTP '+r.status));
  return x;
}
async function connectExpectedAccount(expected){
  const accounts=await provider.request({method:'eth_requestAccounts'});
  const account=String(accounts?.[0]||'').toLowerCase();
  const expectedLower=String(expected||'').toLowerCase();
  if(!account)throw new Error('Base Account did not return an account.');
  if(account!==expectedLower){
    throw new Error('Base Account must match the holder wallet authenticated with Moer Agent. No permission was created.');
  }
  return account;
}
function remember(recordId,permissionHash){
  sessionStorage.setItem(PERMISSION_KEY,JSON.stringify({recordId,permissionHash}));
}
function remembered(){
  try{return JSON.parse(sessionStorage.getItem(PERMISSION_KEY)||'null')}catch{return null}
}
async function syncPermission(recordId,permission){
  const status=await getPermissionStatus(permission);
  const x=await api(`/permissions/${recordId}/sync`,{
    method:'POST',
    body:JSON.stringify({permission:jsonSafe(permission),status:jsonSafe(status)}),
  });
  const dollars=Number(x.remaining_spend_raw||0)/1e6;
  message(`Base permission ${x.status}. Remaining current-period allowance: $${dollars.toFixed(2)} USDC. Live execution is still locked.`);
  return x;
}
async function signPreparedPermission(planResponse){
  if(!planResponse?.ready||!planResponse?.record_id||!planResponse?.sdk_request){
    throw new Error(planResponse?.message||'Permission plan is not ready.');
  }
  const req=planResponse.sdk_request;
  if(Number(req.chainId)!==BASE_CHAIN_ID)throw new Error('Permission plan is not Base mainnet.');
  if(String(req.account||'').toLowerCase()!==wallet())throw new Error('Permission plan wallet does not match the authenticated holder wallet.');

  message('Opening Base Account to review the bounded USDC permission...');
  await connectExpectedAccount(req.account);
  const permission=await requestSpendPermission({
    account:req.account,
    spender:req.spender,
    token:req.token,
    chainId:Number(req.chainId),
    allowance:BigInt(req.allowance),
    periodInDays:Number(req.periodInDays),
    start:new Date(req.start),
    end:new Date(req.end),
    extraData:req.extraData||'0x',
    provider,
  });

  const saved=await api(`/permissions/${planResponse.record_id}/signed`,{
    method:'POST',
    body:JSON.stringify({signed_permission:jsonSafe(permission)}),
  });
  remember(planResponse.record_id,saved.permission_hash);
  message('Permission signed. Verifying its current onchain status...');
  await syncPermission(planResponse.record_id,permission);
  return saved;
}
async function syncRememberedPermission(){
  const item=remembered();
  if(!item?.recordId||!item?.permissionHash)throw new Error('No signed Base permission is remembered in this browser session.');
  await connectExpectedAccount(wallet());
  message('Fetching the signed permission from Base Account...');
  const permission=await fetchPermission({permissionHash:item.permissionHash,provider});
  if(!permission)throw new Error('Base Account could not find the remembered permission.');
  return syncPermission(item.recordId,permission);
}
async function revokeRememberedPermission(){
  const item=remembered();
  if(!item?.recordId||!item?.permissionHash)throw new Error('No signed Base permission is remembered in this browser session.');
  await connectExpectedAccount(wallet());
  message('Fetching permission before revoke...');
  const permission=await fetchPermission({permissionHash:item.permissionHash,provider});
  if(!permission)throw new Error('Base Account could not find the remembered permission.');
  message('Opening Base Account to approve revocation...');
  const hash=await requestRevoke(permission);
  await api(`/permissions/${item.recordId}/revoke-submitted`,{
    method:'POST',
    body:JSON.stringify({transaction_hash:hash}),
  });
  message(`Revocation submitted (${String(hash).slice(0,10)}…). Execution remains locked. Use SYNC after confirmation.`);
  return hash;
}
function addControls(){
  const panel=document.getElementById('baseExecPanel');
  if(!panel||document.getElementById('basePermissionSync'))return;
  const controls=document.createElement('div');
  controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:10px';
  controls.innerHTML='<button id="basePermissionSync" class="button secondary" type="button">SYNC BASE PERMISSION</button><button id="basePermissionRevoke" class="button secondary" type="button">REVOKE BASE PERMISSION</button>';
  panel.appendChild(controls);
  document.getElementById('basePermissionSync')?.addEventListener('click',()=>syncRememberedPermission().catch(e=>message(e.message,true)));
  document.getElementById('basePermissionRevoke')?.addEventListener('click',()=>revokeRememberedPermission().catch(e=>message(e.message,true)));
}

window.MoerBaseAccount={
  provider,
  signPreparedPermission,
  syncRememberedPermission,
  revokeRememberedPermission,
};

document.addEventListener('DOMContentLoaded',()=>{
  addControls();
  const observer=new MutationObserver(addControls);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
});
