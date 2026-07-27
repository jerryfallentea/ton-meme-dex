import { useWallet } from '../context/WalletContext';

export function useTonConnect() {
  const { wallet, connect, disconnect } = useWallet();
  const address = wallet?.friendly ?? null;
  const shortAddress = address ? address.slice(0, 6) + '…' + address.slice(-4) : '';
  return { connected: !!wallet, address, shortAddress, connect, disconnect };
}
