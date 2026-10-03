import {connectedWallet,signingProvider} from '../wallet-auth.js';
const config=window.MoerHolderRelease;
try{
  window.MoerHolderResearchPage=window.MoerHolderPage.createPage({
    document,eventTarget:window,config,fetch:window.fetch.bind(window),
    getWallet:connectedWallet,
    signChallenge:async(message,address,chosen)=>{
      const data=chosen.source==='base_account'?'0x'+Array.from(new TextEncoder().encode(message),b=>b.toString(16).padStart(2,'0')).join(''):message;
      const signature=await chosen.provider.request({method:'personal_sign',params:[data,address]});
      return {signature,source:chosen.source};
    },
    prepareProvider:()=>signingProvider(connectedWallet()),
    sessionModule:window.MoerHolderSession,clientModule:window.MoerHolderIntelligence,reviewModule:window.MoerHolderReview
  });
}catch{
  document.getElementById('pageStatus').textContent='This room needs a reviewed release configuration before it can be used.';
}
