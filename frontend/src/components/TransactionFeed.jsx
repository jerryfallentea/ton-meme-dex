const TON_PRICE_USD = 5.2;

function shortWallet(addr) {
  if (!addr) return 'Unknown';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function fmtUsd(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${Number(v).toFixed(2)}`;
}

function fmtTokens(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number(n).toFixed(2);
}

function fmtPrice(p) {
  if (!p) return '—';
  if (p < 0.000001) return p.toExponential(3);
  if (p < 0.0001) return p.toFixed(8);
  if (p < 0.01) return p.toFixed(6);
  return p.toFixed(5);
}

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

const headerStyle = {
  display: 'grid',
  gridTemplateColumns: '50px 60px 80px 1fr 70px 55px',
  gap: '6px',
  padding: '6px 12px',
  borderBottom: '1px solid var(--border)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  flexShrink: 0,
};

function TxRow({ tx, isNew }) {
  const isBuy = tx.type === 'buy';
  const tonAmt = (tx.total / TON_PRICE_USD).toFixed(3);

  return (
    <div
      className={isNew ? 'slide-in' : ''}
      style={{
        display: 'grid',
        gridTemplateColumns: '50px 60px 80px 1fr 70px 55px',
        gap: '6px',
        padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        fontSize: '11px',
        alignItems: 'center',
      }}
    >
      <span style={{
        color: isBuy ? 'var(--green)' : 'var(--red)',
        fontWeight: 700,
        background: isBuy ? 'var(--green-dim)' : 'var(--red-dim)',
        borderRadius: '4px',
        padding: '2px 6px',
        textAlign: 'center',
        fontSize: '10px',
      }}>
        {isBuy ? 'BUY' : 'SELL'}
      </span>

      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
        {timeAgo(tx.timestamp)}
      </span>

      <span style={{ color: isBuy ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {fmtUsd(tx.total)}
      </span>

      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {fmtTokens(tx.amount)}
      </span>

      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
        {tonAmt} TON
      </span>

      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
        {shortWallet(tx.wallet)}
      </span>
    </div>
  );
}

export default function TransactionFeed({ txns = [], symbol = '', newestId }) {
  return (
    <div>
      <div style={headerStyle}>
        <span>Side</span>
        <span>Time</span>
        <span>USD</span>
        <span>{symbol || 'Amount'}</span>
        <span>TON</span>
        <span>Wallet</span>
      </div>
      {txns.length === 0
        ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Waiting for transactions…
          </div>
        : txns.map((tx) => <TxRow key={tx.id} tx={tx} isNew={tx.id === newestId} />)
      }
    </div>
  );
}
