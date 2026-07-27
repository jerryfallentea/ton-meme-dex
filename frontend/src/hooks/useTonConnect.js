import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

const TRUST_WALLET_CONFIG = {
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

  async function connect() {
    tonConnectUI.openModal();
  }

  function connectTrustWallet() {
    // Use openSingleWalletModal if available (TonConnect UI v2+), else fall back to connector
    if (typeof tonConnectUI.openSingleWalletModal === 'function') {
      tonConnectUI.openSingleWalletModal('trust_wallet');
      return;
    }
    const link = tonConnectUI.connector.connect(TRUST_WALLET_CONFIG);
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(link, { try_instant_view: false });
    } else {
      window.open(link, '_blank');
    }
  }

  async function disconnect() {
    await tonConnectUI.disconnect();
  }

  return { address, shortAddress: shortAddress(address), connected: !!address, connect, connectTrustWallet, disconnect };
}
