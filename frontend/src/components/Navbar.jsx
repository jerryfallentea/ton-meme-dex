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
    gap: '8px',
    fontWeight: 700,
    fontSize: '16px',
    color: 'var(--text-primary)',
  },
  logoIcon: { fontSize: '20px' },
  logoAccent: { color: 'var(--accent)' },
};

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        <span style={styles.logoIcon}>💎</span>
        <span>TON<span style={styles.logoAccent}>DEX</span></span>
      </Link>
      <WalletButton />
    </nav>
  );
}
