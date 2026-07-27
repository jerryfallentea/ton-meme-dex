import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';


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

  async function connectTrustWallet() {
    if (!tonConnectUI) return;
    try {
      const wallets = await tonConnectUI.getWallets();
      const trustWallet = wallets.find(w => w.appName === 'trust_wallet');
      if (trustWallet) {
        tonConnectUI.openSingleWalletModal(trustWallet);
      } else {
        tonConnectUI.openModal();
      }
    } catch {
      tonConnectUI.openModal();
    }
  }

  async function disconnect() {
    await tonConnectUI.disconnect();
  }

  return { address, shortAddress: shortAddress(address), connected: !!address, connect, connectTrustWallet, disconnect };
}
