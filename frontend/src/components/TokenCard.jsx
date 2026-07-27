import { useNavigate } from 'react-router-dom';

function formatPrice(p) {
  if (p === undefined || p === null) return '—';
  if (p < 0.000001) return p.toExponential(3);
  if (p < 0.001) return p.toFixed(8);
  if (p < 1) return p.toFixed(6);
  return p.toFixed(4);
}

function formatMarketCap(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  img: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    background: 'var(--bg-hover)',
    flexShrink: 0,
  },
  imgPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' },
  symbol: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' },
  right: { textAlign: 'right', flexShrink: 0 },
  price: { fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px' },
  change: (v) => ({
    fontSize: '11px',
    fontWeight: 600,
    color: v >= 0 ? 'var(--green)' : 'var(--red)',
    marginTop: '2px',
  }),
  mc: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' },
};

export default function TokenCard({ token }) {
  const navigate = useNavigate();

  return (
    <div
      style={styles.card}
      onClick={() => navigate(`/token/${token.id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--bg-card)';
      }}
    >
      {token.image
        ? <img src={token.image} alt={token.symbol} style={styles.img} onError={(e) => { e.target.style.display = 'none'; }} />
        : <div style={styles.imgPlaceholder}>{token.symbol[0]}</div>
      }
      <div style={styles.info}>
        <div style={styles.name}>{token.name}</div>
        <div style={styles.symbol}>{token.symbol} · TON</div>
      </div>
      <div style={styles.right}>
        <div style={styles.price} className="mono">${formatPrice(token.price)}</div>
        <div style={styles.change(token.change_24h)}>
          {token.change_24h >= 0 ? '+' : ''}{Number(token.change_24h).toFixed(2)}%
        </div>
        <div style={styles.mc}>MC {formatMarketCap(token.market_cap)}</div>
      </div>
    </div>
  );
}
