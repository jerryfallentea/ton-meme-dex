import { Link } from 'react-router-dom';
import WalletButton from './WalletButton';

const styles = {
  nav: {
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '52px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    fontWeight: 700,
    fontSize: '16px',
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  logoAccent: { color: 'var(--accent)' },
};

function DiamondLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 8V16L12 22L4 16V8L12 2Z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M4 8L12 14L20 8" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 14V22" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DevResetButton() {
  if (!import.meta.env.DEV) return null;
  function reset() {
    localStorage.removeItem('ton_wallet');
    window.location.reload();
  }
  return (
    <button
      onClick={reset}
      title="DEV: clear wallet storage"
      style={{
        position: 'fixed', bottom: 72, right: 12, zIndex: 9999,
        padding: '4px 8px', fontSize: 10, fontWeight: 700,
        background: 'var(--red-dim)', color: 'var(--red)',
        border: '1px solid var(--red)', borderRadius: 6,
        cursor: 'pointer', opacity: 0.8,
      }}
    >
      RESET WALLET
    </button>
  );
}

export default function Navbar() {
  return (
    <>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>
          <DiamondLogo />
          <span>TON<span style={styles.logoAccent}>DEX</span></span>
        </Link>
        <WalletButton />
      </nav>
      <DevResetButton />
    </>
  );
}
