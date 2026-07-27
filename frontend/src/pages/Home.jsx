import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TokenCard from '../components/TokenCard';

const styles = {
  page: { padding: '16px', maxWidth: '600px', margin: '0 auto' },
  header: { marginBottom: '20px' },
  title: { fontSize: '22px', fontWeight: 700, marginBottom: '4px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '13px' },
  search: {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-primary)',
    fontSize: '13px', marginBottom: '16px',
  },
  tabs: { display: 'flex', gap: '4px', marginBottom: '16px' },
  tab: (active) => ({
    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
    background: active ? 'var(--accent)' : 'var(--bg-card)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    cursor: 'pointer',
  }),
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  loading: { textAlign: 'center', padding: '48px', color: 'var(--text-muted)' },
  empty: { textAlign: 'center', padding: '48px', color: 'var(--text-muted)' },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '20px',
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '10px 12px',
  },
  statLabel: { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' },
  statValue: { fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' },
};

export default function Home() {
  const [searchParams] = useSearchParams();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(searchParams.get('sort') || 'mc');

  useEffect(() => {
    fetch('/api/tokens')
      .then((r) => r.json())
      .then((data) => { setTokens(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/tokens').then((r) => r.json()).then(setTokens).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tokens
    .filter((t) => {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'mc') return b.market_cap - a.market_cap;
      if (sort === 'change') return b.change_24h - a.change_24h;
      if (sort === 'vol') return b.volume_24h - a.volume_24h;
      return 0;
    });

  const totalMC = tokens.reduce((s, t) => s + t.market_cap, 0);
  const gainers = tokens.filter((t) => t.change_24h > 0).length;

  function fmtMC(v) {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toFixed(0)}`;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}>🔥 TON Meme Coins</div>
        <div style={styles.subtitle}>The hottest meme coins on the TON network</div>
      </div>

      {!loading && tokens.length > 0 && (
        <div style={styles.statsBar}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Tokens</div>
            <div style={styles.statValue}>{tokens.length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total MC</div>
            <div style={styles.statValue}>{fmtMC(totalMC)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Gainers 24h</div>
            <div style={{ ...styles.statValue, color: 'var(--green)' }}>{gainers}/{tokens.length}</div>
          </div>
        </div>
      )}

      <input
        style={styles.search}
        placeholder="🔍 Search tokens…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={styles.tabs}>
        {[['mc', 'Market Cap'], ['change', '24h Change'], ['vol', 'Volume']].map(([key, label]) => (
          <button key={key} style={styles.tab(sort === key)} onClick={() => setSort(key)}>{label}</button>
        ))}
      </div>

      {loading
        ? <div style={styles.loading}>Loading tokens…</div>
        : filtered.length === 0
        ? <div style={styles.empty}>No tokens found</div>
        : <div style={styles.list}>{filtered.map((t) => <TokenCard key={t.id} token={t} />)}</div>
      }
    </div>
  );
}
