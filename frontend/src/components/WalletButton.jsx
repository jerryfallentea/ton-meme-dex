import { useTonConnect } from '../hooks/useTonConnect';

const styles = {
  btn: (connected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    background: connected ? 'var(--bg-hover)' : 'var(--accent)',
    color: connected ? 'var(--text-primary)' : '#fff',
    border: connected ? '1px solid var(--border)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
  dot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 },
};

function WalletIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="16" cy="15" r="1.2" fill="currentColor"/>
    </svg>
  );
}

export default function WalletButton() {
  const { connected, shortAddress, connect, disconnect } = useTonConnect();

  if (connected) {
    return (
      <button style={styles.btn(true)} onClick={disconnect} title="Click to disconnect">
        <span style={styles.dot} />
        {shortAddress}
      </button>
    );
  }

  return (
    <button style={styles.btn(false)} onClick={connect}>
      <WalletIcon />
      Connect Wallet
    </button>
  );
}
