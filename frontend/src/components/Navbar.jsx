import { Link, useLocation } from 'react-router-dom';
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
  nav_links: {
    display: 'flex',
    gap: '4px',
  },
  link: (active) => ({
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    background: active ? 'var(--bg-hover)' : 'transparent',
    transition: 'all 0.15s',
  }),
};

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        <span style={styles.logoIcon}>💎</span>
        <span>TON<span style={styles.logoAccent}>DEX</span></span>
      </Link>
      <div style={styles.nav_links}>
        <Link to="/" style={styles.link(pathname === '/')}>Markets</Link>
        <Link to="/portfolio" style={styles.link(pathname === '/portfolio')}>Portfolio</Link>
      </div>
      <WalletButton />
    </nav>
  );
}
