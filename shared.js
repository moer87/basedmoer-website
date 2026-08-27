(function () {
  const currentPath = window.location.pathname;
  const CONTRACT = "0x5CafB7C0181fEd5b6d62AA331699989861c27AE7";
  const BASE_CHAIN_ID = "0x2105";
  const HOLDER_PAGES = ["/live/", "/academy/", "/moer-flip/", "/profile/"];
  const preview = new URLSearchParams(window.location.search).get("preview") === "holder";
  let wallet = null;
  let isHolder = preview;

  function active(path) {
    if (path === "/") return currentPath === "/" ? "active" : "";
    return currentPath.startsWith(path) ? "active" : "";
  }
  function shortAddress(address) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "CONNECT WALLET"; }
  function publicLinks() { return `<a href="/" class="${active("/")}">Home</a><a href="/moerverse/" class="${active("/moerverse/")}">Moerverse</a>`; }
  function holderLinks() {
    if (!isHolder) return "";
    const q = preview ? "?preview=holder" : "";
    return `<a href="/live/${q}" class="${active("/live/")}">Live</a><a href="/academy/${q}" class="${active("/academy/")}">Academy</a><a href="/moer-flip/${q}" class="${active("/moer-flip/")}">Moer Flip</a><a href="/profile/${q}" class="${active("/profile/")}">Profile</a>`;
  }
  function walletControls(mobile=false) {
    const cls = mobile ? "site-mobile-follow" : "site-follow";
    if (wallet) return `<button class="${cls} site-wallet-button" type="button">${shortAddress(wallet)}</button><button class="${cls} site-disconnect-button" type="button">DISCONNECT</button>`;
    return `<button class="${cls} site-wallet-button" type="button">CONNECT WALLET</button>`;
  }
  function headerMarkup() {
    return `<header class="site-header"><div class="container site-nav-shell"><a class="site-brand" href="/" aria-label="Based Moer Home"><img src="/assets/based-moer-logo.jpg" alt="Based Moer logo"><span class="site-brand-name">BASED MOER</span></a><nav class="site-desktop-nav" aria-label="Main navigation">${publicLinks()}${holderLinks()}</nav><div class="site-wallet-controls">${walletControls(false)}</div><button class="site-mobile-toggle" id="siteMobileToggle" aria-label="Open menu">☰</button></div><div class="container site-mobile-menu" id="siteMobileMenu"><div>${publicLinks()}${holderLinks()}</div><div class="site-wallet-controls">${walletControls(true)}</div></div></header>`;
  }
  function footerMarkup() {
    return `<footer class="site-footer"><div class="container"><div class="footer-grid"><div><div class="footer-brand"><img src="/assets/based-moer-logo.jpg" alt="Based Moer"><strong>BASED MOER</strong></div><div class="footer-copy">Pixel-first • Built on Base<br><br>An artist-built onchain universe combining original pixel art, Moe AI market intelligence, education and interactive experiences.</div></div><div class="footer-column"><h4>Explore</h4><a href="/moerverse/">Moerverse</a>${isHolder ? `<a href="/live/${preview?'?preview=holder':''}">Live Engine</a><a href="/academy/${preview?'?preview=holder':''}">Moe Academy</a><a href="/moer-flip/${preview?'?preview=holder':''}">Moer Flip</a>` : ''}</div><div class="footer-column"><h4>Community</h4><a href="https://x.com/basedmoer" target="_blank" rel="noopener noreferrer">X</a><a href="https://discord.gg/B6Pu9fARTX" target="_blank" rel="noopener noreferrer">Discord</a><a href="https://www.youtube.com/@BasedMoer" target="_blank" rel="noopener noreferrer">YouTube</a><a href="https://basedmoer.gitbook.io/based-moer" target="_blank" rel="noopener noreferrer">Docs</a></div></div><div class="footer-bottom"><span>© 2026 Based Moer. Stay Based.</span><div class="footer-disclaimer">Based Moer is an independent creator project. Moe AI and Moe Academy provide experimental market-analysis and educational information only. Nothing on BasedMoer.com constitutes financial, investment or trading advice.</div></div></div></footer>`;
  }
  function render() { const h=document.getElementById("globalHeader"); if(h){h.innerHTML=headerMarkup();bindHeader();} const f=document.getElementById("globalFooter"); if(f)f.innerHTML=footerMarkup(); }
  function bindHeader() {
    const toggle=document.getElementById("siteMobileToggle"), menu=document.getElementById("siteMobileMenu");
    if(toggle&&menu)toggle.addEventListener("click",()=>{menu.classList.toggle("open");toggle.textContent=menu.classList.contains("open")?"✕":"☰";});
    document.querySelectorAll(".site-wallet-button").forEach(b=>b.addEventListener("click",connectWallet));
    document.querySelectorAll(".site-disconnect-button").forEach(b=>b.addEventListener("click",disconnectWallet));
  }
  async function rpc(method,params){return window.ethereum.request({method,params});}
  async function checkHolder(address){const padded=address.toLowerCase().replace("0x","").padStart(64,"0");const result=await rpc("eth_call",[{to:CONTRACT,data:"0x70a08231"+padded},"latest"]);return BigInt(result||"0x0")>0n;}
  async function ensureBase(){const chain=await rpc("eth_chainId");if(chain===BASE_CHAIN_ID)return true;try{await rpc("wallet_switchEthereumChain",[{chainId:BASE_CHAIN_ID}]);return true;}catch(e){alert("Please switch your wallet to Base to verify Based Ape Punks ownership.");return false;}}
  async function connectWallet(){if(!window.ethereum){alert("No compatible Ethereum wallet was detected. Install a wallet that supports Base, then try again.");return;}try{const accounts=await rpc("eth_requestAccounts");if(!accounts||!accounts[0])return;if(!(await ensureBase()))return;wallet=accounts[0];isHolder=await checkHolder(wallet);sessionStorage.setItem("basedMoerWallet",wallet);sessionStorage.setItem("basedMoerHolder",isHolder?"1":"0");render();updateHolderGate();window.dispatchEvent(new CustomEvent("basedmoer:wallet",{detail:{wallet,isHolder}}));if(!isHolder)alert("Wallet connected, but no Based Ape Punks NFT was found in this wallet.");}catch(e){console.error(e);alert("Wallet connection failed. Please try again.");}}
  function disconnectWallet(){wallet=null;isHolder=preview;sessionStorage.removeItem("basedMoerWallet");sessionStorage.removeItem("basedMoerHolder");render();updateHolderGate();window.dispatchEvent(new CustomEvent("basedmoer:wallet",{detail:{wallet:null,isHolder}}));}
  function updateHolderGate(){document.querySelectorAll("[data-holder-content]").forEach(el=>el.hidden=!isHolder);document.querySelectorAll("[data-holder-lock]").forEach(el=>el.hidden=isHolder);}
  async function restoreWallet(){if(preview||!window.ethereum)return;try{const accounts=await rpc("eth_accounts");if(!accounts||!accounts[0])return;wallet=accounts[0];if(await ensureBase())isHolder=await checkHolder(wallet);render();updateHolderGate();}catch(e){console.warn("Could not restore wallet",e);}}
  document.addEventListener("DOMContentLoaded",()=>{render();updateHolderGate();restoreWallet();if(preview)document.body.classList.add("holder-preview");if(window.ethereum){window.ethereum.on?.("accountsChanged",()=>location.reload());window.ethereum.on?.("chainChanged",()=>location.reload());}if(HOLDER_PAGES.some(path=>currentPath.startsWith(path)))document.body.classList.add("holder-route");});
})();