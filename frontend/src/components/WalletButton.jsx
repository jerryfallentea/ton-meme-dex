import { useState, useRef, useEffect } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';

function WalletIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="16" cy="15" r="1.2" fill="currentColor"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function WalletButton() {
  const { connected, address, shortAddress, connect, disconnect } = useTonConnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDisconnect() {
    setOpen(false);
    disconnect();
  }

  if (!connected) {
    return (
      <button
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
        onClick={connect}
      >
        <WalletIcon /> Connect Wallet
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        {shortAddress}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '200px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden' }}>
          {/* Address display */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Connected</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {address?.slice(0, 12)}…{address?.slice(-8)}
            </div>
          </div>
          {/* Actions */}
          <button onClick={copyAddress}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', color: copied ? 'var(--green)' : 'var(--text-primary)', fontSize: '13px', fontWeight: 500, borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer' }}>
            <CopyIcon /> {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button onClick={handleDisconnect}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', color: 'var(--red)', fontSize: '13px', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}>
            <DisconnectIcon /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
