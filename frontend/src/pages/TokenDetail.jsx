import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TradingChart from '../components/TradingChart';
import TransactionFeed from '../components/TransactionFeed';
import BuySellModal from '../components/BuySellModal';
import { useSocket } from '../hooks/useSocket';

function fmt(p) {
  if (!p) return '—';
  if (p < 0.000001) return p.toExponential(4);
  if (p < 0.001) return p.toFixed(8);
  return p.toFixed(6);
}

function fmtMC(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Number(v).toFixed(0)}`;
}

export default function TokenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [candles, setCandles] = useState([]);
  const [txns, setTxns] = useState([]);
  const [price, setPrice] = useState(null);
  const [newestTxId, setNewestTxId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const candleCallbackRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tokens/${id}`).then((r) => r.json()),
      fetch(`/api/tokens/${id}/candles`).then((r) => r.json()),
      fetch(`/api/tokens/${id}/transactions?limit=50`).then((r) => r.json()),
    ]).then(([tok, c, t]) => {
      setToken(tok);
      setPrice(tok.price);
      setCandles(c);
      setTxns(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleNewCandle = useCallback((candle) => {
    setCandles((prev) => {
      const existing = prev.find((c) => c.time === candle.time);
      if (existing) return prev.map((c) => c.time === candle.time ? candle : c);
      return [...prev, candle];
    });
    if (candleCallbackRef.current) candleCallbackRef.current(candle);
  }, []);

  const handleNewTx = useCallback((tx) => {
    setTxns((prev) => [tx, ...prev].slice(0, 50));
    setNewestTxId(tx.id);
  }, []);

  const handlePriceUpdate = useCallback((p) => setPrice(p), []);

  useSocket(Number(id), {
    onCandle: handleNewCandle,
    onTransaction: handleNewTx,
    onPriceUpdate: handlePriceUpdate,
  });

  const registerCandleCallback = useCallback((cb) => {
    candleCallbackRef.current = cb;
    return () => { candleCallbackRef.current = null; };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!token || token.error) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Token not found</div>;

  const change = Number(token.change_24h);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => navigate('/')} style={{ color: 'var(--text-secondary)', background: 'none', fontSize: '18px' }}>←</button>
          {token.image && <img src={token.image} alt={token.symbol} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{token.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{token.symbol} · TON</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px' }}>${fmt(price)}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[
            ['Market Cap', fmtMC(token.market_cap)],
            ['24h Volume', fmtMC(token.volume_24h)],
            ['Holders', Number(token.holders).toLocaleString()],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '6px 8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 260px', borderBottom: '1px solid var(--border)' }}>
        <TradingChart candles={candles} onNewCandle={registerCandleCallback} />
      </div>

      {/* Tabs: Transactions */}
      <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🔄 Live Transactions
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TransactionFeed txns={txns} symbol={token.symbol} newestId={newestTxId} />
        </div>
      </div>

      {/* Buy / Sell buttons */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', background: 'var(--bg-secondary)' }}>
        <button
          onClick={() => setShowModal('buy')}
          style={{ flex: 1, padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', background: 'var(--green)', color: '#fff' }}
        >
          Buy {token.symbol}
        </button>
        <button
          onClick={() => setShowModal('sell')}
          style={{ flex: 1, padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', background: 'var(--red)', color: '#fff' }}
        >
          Sell {token.symbol}
        </button>
      </div>

      {showModal && (
        <BuySellModal
          token={{ ...token, price }}
          onClose={() => setShowModal(false)}
          onSuccess={(tx) => {
            setTxns((prev) => [tx, ...prev].slice(0, 50));
            setNewestTxId(tx.id);
            setPrice(tx.price);
          }}
        />
      )}
    </div>
  );
}
