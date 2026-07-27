import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

const TRUST_WALLET = {
  universalLink: 'https://link.trustwallet.com/ton-connect',
  bridgeUrl: 'https://bridge.tonapi.io/bridge',
};

export function useTonConnect() {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  const address = wallet?.account?.address || null;

  function shortAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  function connect() {
    tonConnectUI.openModal();
  }

  function connectTrustWallet() {
    try {
      // Use the internal connector to generate the Trust Wallet deep link directly,
      // bypassing the TonConnect modal. The connector handles the bridge session
      // so the connection response is still captured by the UI provider.
      const link = tonConnectUI.connector.connect(TRUST_WALLET);
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(link, { try_instant_view: false });
      } else {
        window.open(link, '_blank');
      }
    } catch {
      // Fallback: open the general modal so the user can still connect
      tonConnectUI.openModal();
    }
  }

  async function disconnect() {
    await tonConnectUI.disconnect();
  }

  return { address, shortAddress: shortAddress(address), connected: !!address, connect, connectTrustWallet, disconnect };
}
