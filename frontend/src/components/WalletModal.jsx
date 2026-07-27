import { useState } from 'react';
import { createPortal } from 'react-dom';

// Accepts friendly TON address (EQ.../UQ...) or raw (0:<hex>)
function isValidTonAddress(addr) {
  if (/^[EU]Q[A-Za-z0-9_-]{46}$/.test(addr)) return true;
  if (/^-?[01]:[0-9a-fA-F]{64}$/.test(addr)) return true;
  return false;
}

export default function WalletModal({ onConfirm, onClose }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const addr = value.trim();
    if (!isValidTonAddress(addr)) {
      setError('Enter a valid TON address (starts with EQ… or UQ…)');
      return;
    }
    onConfirm(addr);
  }

  function handleChange(e) {
    setValue(e.target.value);
    if (error) setError('');
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg-secondary)',
          borderRadius: '18px 18px 0 0',
          padding: '8px 0 32px',
          animation: 'slideUp 0.2s ease',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(60px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '8px auto 20px' }} />

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Connect Wallet</span>
          <button onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-muted)', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Paste your TON wallet address
          </div>

          <input
            autoFocus
            value={value}
            onChange={handleChange}
            placeholder="EQ… or UQ…"
            spellCheck={false}
            style={{
              width: '100%', padding: '11px 14px',
              background: 'var(--bg-hover)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 10, color: 'var(--text-primary)',
              fontSize: 13, fontFamily: 'var(--font-mono)',
              outline: 'none', transition: 'border 0.15s',
            }}
          />

          {error && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--red)' }}>{error}</div>
          )}

          <button
            type="submit"
            style={{
              marginTop: 14, width: '100%', padding: '12px',
              background: value.trim() ? 'var(--accent)' : 'var(--bg-hover)',
              color: value.trim() ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Connect
          </button>

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Open your TON wallet app → copy your address → paste it above
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
