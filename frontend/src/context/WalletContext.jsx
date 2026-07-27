import { createContext, useContext, useState, useRef } from 'react';
import { createSession, buildConnectUrl, listenForWallet } from '../lib/tonWallet';
import WalletModal from '../components/WalletModal';

const STORAGE_KEY = 'ton_wallet';
const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

const WalletCtx = createContext(null);

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(loadStored);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectingName, setConnectingName] = useState('');
  const abortRef = useRef(null);

  function connect() {
    setModalOpen(true);
  }

  function closeModal() {
    abortRef.current?.abort();
    setConnecting(false);
    setConnectingName('');
    setModalOpen(false);
  }

  async function selectWallet({ universalLink, name }) {
    const session = createSession();
    const url = buildConnectUrl(universalLink, MANIFEST_URL, session.clientId);

    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank');

    setConnecting(true);
    setConnectingName(name);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const info = await listenForWallet(session.clientId, session.keypair, ctrl.signal);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      setWallet(info);
      setModalOpen(false);
      setConnecting(false);
      setConnectingName('');
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[wallet]', e);
      setConnecting(false);
      setConnectingName('');
    }
  }

  function disconnect() {
    abortRef.current?.abort();
    localStorage.removeItem(STORAGE_KEY);
    setWallet(null);
  }

  return (
    <WalletCtx.Provider value={{ wallet, connect, disconnect }}>
      {children}
      {modalOpen && (
        <WalletModal
          connecting={connecting}
          connectingName={connectingName}
          onSelect={selectWallet}
          onClose={closeModal}
        />
      )}
    </WalletCtx.Provider>
  );
}

export function useWallet() {
  return useContext(WalletCtx);
}
