function shortWallet(addr) {
  if (!addr) return 'Unknown';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function formatAmount(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const headerStyle = {
  display: 'grid',
  gridTemplateColumns: '46px 1fr 1fr 60px',
  gap: '8px',
  padding: '6px 12px',
  borderBottom: '1px solid var(--border)',
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

function TxRow({ tx, symbol, isNew }) {
  const isBuy = tx.type === 'buy';
  return (
    <div
      className={isNew ? 'slide-in' : ''}
      style={{
        display: 'grid',
        gridTemplateColumns: '46px 1fr 1fr 60px',
        gap: '8px',
        padding: '7px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: '12px',
        alignItems: 'center',
        background: isBuy ? 'rgba(0,208,132,0.03)' : 'rgba(255,68,102,0.03)',
      }}
    >
      <span style={{
        color: isBuy ? 'var(--green)' : 'var(--red)',
        fontWeight: 700,
        background: isBuy ? 'var(--green-dim)' : 'var(--red-dim)',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '11px',
        textAlign: 'center',
      }}>
        {isBuy ? 'BUY' : 'SELL'}
      </span>
      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
        {shortWallet(tx.wallet)}
      </span>
      <span className="mono" style={{ color: 'var(--text-primary)' }}>
        {formatAmount(tx.amount)} {symbol}
      </span>
      <span style={{ color: 'var(--text-muted)', textAlign: 'right', fontSize: '11px' }}>
        {timeAgo(tx.timestamp)}
      </span>
    </div>
  );
}

export default function TransactionFeed({ txns = [], symbol = '', newestId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={headerStyle}>
        <span>Side</span>
        <span>Wallet</span>
        <span>Amount</span>
        <span style={{ textAlign: 'right' }}>Time</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {txns.length === 0
          ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Waiting for transactions…</div>
          : txns.map((tx) => <TxRow key={tx.id} tx={tx} symbol={symbol} isNew={tx.id === newestId} />)
        }
      </div>
    </div>
  );
}
