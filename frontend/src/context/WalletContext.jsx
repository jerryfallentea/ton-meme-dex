import { createContext, useContext, useState } from 'react';
import WalletModal from '../components/WalletModal';

const STORAGE_KEY = 'ton_wallet';
const WalletCtx = createContext(null);

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(loadStored);
  const [modalOpen, setModalOpen] = useState(false);

  function connect() { setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function confirmAddress(address) {
    const info = { friendly: address };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setWallet(info);
    setModalOpen(false);
  }

  function disconnect() {
    localStorage.removeItem(STORAGE_KEY);
    setWallet(null);
  }

  return (
    <WalletCtx.Provider value={{ wallet, connect, disconnect }}>
      {children}
      {modalOpen && <WalletModal onConfirm={confirmAddress} onClose={closeModal} />}
    </WalletCtx.Provider>
  );
}

export function useWallet() { return useContext(WalletCtx); }
