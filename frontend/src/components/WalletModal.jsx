import { createPortal } from 'react-dom';

const WALLETS = [
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    universalLink: 'https://app.tonkeeper.com/ton-connect',
    bg: '#45AEF5',
    letter: 'TK',
  },
  {
    id: 'mytonwallet',
    name: 'MyTonWallet',
    universalLink: 'https://mytonwallet.io/connect',
    bg: '#0088CC',
    letter: 'MT',
  },
  {
    id: 'tonhub',
    name: 'Tonhub',
    universalLink: 'https://tonhub.com/ton-connect',
    bg: '#564CE2',
    letter: 'TH',
  },
];

function Spinner() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
      style={{ animation: 'spin 0.9s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="16" cy="16" r="12" stroke="var(--border)" strokeWidth="3" />
      <path d="M16 4a12 12 0 0 1 12 12" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WalletModal({ connecting, connectingName, onSelect, onClose }) {
  const overlay = (
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
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border)', margin: '8px auto 20px',
        }} />

        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            Connect Wallet
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)', border: 'none', color: 'var(--text-muted)',
              width: 28, height: 28, borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {connecting ? (
          /* waiting state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 14, padding: '32px 20px 8px',
          }}>
            <Spinner />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                Opening {connectingName}…
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Approve the connection in your wallet app
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 8, padding: '8px 24px',
                background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          /* wallet list */
          <div style={{ padding: '8px 12px 0' }}>
            {WALLETS.map(w => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 10px', borderRadius: 10, background: 'none',
                  color: 'var(--text-primary)', textAlign: 'left',
                  transition: 'background 0.12s', cursor: 'pointer',
                  border: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {/* wallet icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: w.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                  fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.5px',
                }}>
                  {w.letter}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    TON Connect 2.0
                  </div>
                </div>
                <ArrowRight />
              </button>
            ))}

            <div style={{
              marginTop: 12, padding: '10px 10px 0',
              borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5,
            }}>
              Open your wallet app and approve the connection request
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
