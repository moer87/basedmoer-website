(() => {
  const API = 'https://moe-ai-production.up.railway.app';
  const form = document.getElementById('ogForm');
  const closed = document.getElementById('ogClosed');
  const captchaMount = document.getElementById('captchaMount');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');
  let captchaToken = '';

  function setStatus(message, kind = '') {
    statusEl.textContent = message || '';
    statusEl.className = `status ${kind}`.trim();
  }

  function loadTurnstile(siteKey) {
    if (!siteKey) {
      closed.hidden = false;
      form.hidden = true;
      closed.textContent = 'OG applications are being prepared. Captcha verification is not configured yet.';
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.turnstile.render(captchaMount, {
        sitekey: siteKey,
        theme: 'dark',
        callback: token => { captchaToken = token; setStatus(''); },
        'expired-callback': () => { captchaToken = ''; setStatus('Captcha expired. Please verify again.', 'error'); },
        'error-callback': () => { captchaToken = ''; setStatus('Captcha could not load. Please try again.', 'error'); }
      });
    };
    document.head.appendChild(script);
  }

  async function init() {
    try {
      const response = await fetch(`${API}/v1/og/status`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.applications_open) {
        closed.hidden = false;
        form.hidden = true;
        return;
      }
      form.hidden = false;
      closed.hidden = true;
      loadTurnstile(data.turnstile_site_key);
    } catch (_) {
      closed.hidden = false;
      form.hidden = true;
      closed.textContent = 'OG application status is temporarily unavailable. Please try again later.';
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus('');

    const wallet = document.getElementById('walletAddress').value.trim();
    const xHandle = document.getElementById('xHandle').value.trim();
    const discord = document.getElementById('discordUsername').value.trim();
    const website = document.getElementById('website').value.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setStatus('Enter a valid Base/EVM wallet address.', 'error');
      return;
    }
    // Social identity is intentionally not required client-side. The backend first
    // checks PAPC ownership; only non-PAPC applicants are required to provide X or Discord.
    if (!captchaToken) {
      setStatus('Please complete the captcha.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'SUBMITTING…';

    try {
      const response = await fetch(`${API}/v1/og/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: wallet,
          x_handle: xHandle,
          discord_username: discord,
          captcha_token: captchaToken,
          website
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Unable to submit the application.');
      form.reset();
      captchaToken = '';
      if (window.turnstile) window.turnstile.reset();
      setStatus(data.message || (data.status === 'approved' ? 'OG access approved.' : 'Application received.'), 'ok');
    } catch (error) {
      setStatus(error.message || 'Unable to submit the application.', 'error');
      if (window.turnstile) window.turnstile.reset();
      captchaToken = '';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'SUBMIT OG APPLICATION';
    }
  });

  init();
})();