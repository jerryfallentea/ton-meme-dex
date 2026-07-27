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

  async function disconnect() {
    await tonConnectUI.disconnect();
  }

  return { address, shortAddress: shortAddress(address), connected: !!address, connect, disconnect };
}
