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

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        <DiamondLogo />
        <span>TON<span style={styles.logoAccent}>DEX</span></span>
      </Link>
      <WalletButton />
    </nav>
  );
}
