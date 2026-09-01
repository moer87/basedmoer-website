import { createBaseAccountSDK } from 'https://cdn.jsdelivr.net/npm/@base-org/account@2.5.10/+esm';

const BASE_CHAIN_ID = 8453;

const sdk = createBaseAccountSDK({
  appName: 'Based Moer',
  appLogoUrl: new URL('/assets/based-moer-logo.jpg', window.location.origin).href,
  appChainIds: [BASE_CHAIN_ID],
});

const provider = sdk.getProvider();

function exposeCompatibilityProvider() {
  // Older holder-game code expects an EIP-1193 provider at window.ethereum.
  // Preserve an existing injected wallet, but bridge Base Account when none exists.
  if (!window.ethereum && provider?.request) window.ethereum = provider;
}

export async function connectBaseAccount() {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const address = String(accounts?.[0] || '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    throw new Error('Base Account did not return a valid account.');
  }
  exposeCompatibilityProvider();
  return { address, provider, source: 'base_account' };
}

export async function restoreBaseAccount() {
  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    const address = String(accounts?.[0] || '').toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) return null;
    exposeCompatibilityProvider();
    return { address, provider, source: 'base_account' };
  } catch {
    return null;
  }
}

export const baseAccountProvider = provider;
