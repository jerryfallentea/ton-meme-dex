import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

const TRUST_WALLET = {
  appName: 'trust_wallet',
  name: 'Trust Wallet',
  imageUrl: 'https://assets-cdn.trustwallet.com/dapps/trust.logo.png',
  aboutUrl: 'https://trustwallet.com',
  universalLink: 'https://link.trustwallet.com/ton-connect',
  bridgeUrl: 'https://bridge.tonapi.io/bridge',
  platforms: ['ios', 'android', 'chrome', 'firefox', 'edge', 'safari'],
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
    tonConnectUI.openSingleWalletModal(TRUST_WALLET);
  }

  async function disconnect() {
    await tonConnectUI.disconnect();
  }

  return { address, shortAddress: shortAddress(address), connected: !!address, connect, connectTrustWallet, disconnect };
}
