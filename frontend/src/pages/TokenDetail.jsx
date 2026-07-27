import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TradingChart from '../components/TradingChart';
import TransactionFeed from '../components/TransactionFeed';
import BuySellModal from '../components/BuySellModal';
import TpOrderModal from '../components/TpOrderModal';
import { useSocket } from '../hooks/useSocket';
import { useTonConnect } from '../hooks/useTonConnect';

const API = import.meta.env.VITE_API_URL || '';

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
  const { connected, address } = useTonConnect();
  const [token, setToken] = useState(null);
  const [candles, setCandles] = useState([]);
  const [txns, setTxns] = useState([]);
  const [price, setPrice] = useState(null);
  const [newestTxId, setNewestTxId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showTpModal, setShowTpModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [tpOrders, setTpOrders] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const candleCallbackRef = useRef(null);
  const tickCallbackRef   = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/tokens/${id}`).then((r) => r.json()),
      fetch(`${API}/api/tokens/${id}/candles`).then((r) => r.json()),
      fetch(`${API}/api/tokens/${id}/transactions?limit=50`).then((r) => r.json()),
    ]).then(([tok, c, t]) => {
      setToken(tok);
      setPrice(tok.price);
      setCandles(c);
      setTxns(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Load TP orders and portfolio when wallet connects
  useEffect(() => {
    if (!connected || !address) return;
    fetch(`${API}/api/orders/token/${id}/${address}`).then((r) => r.json()).then(setTpOrders).catch(() => {});
    fetch(`${API}/api/tokens/${id}/portfolio/${address}`).then((r) => r.json()).then(setPortfolio).catch(() => {});
  }, [connected, address, id]);

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

  // Candle tick: update header price in real-time and forward to chart
  const handleCandleTick = useCallback((candle) => {
    setPrice(candle.close);
    tickCallbackRef.current?.(candle);
  }, []);

  // Socket TP events
  useSocket(Number(id), {
    onCandle: handleNewCandle,
    onCandleTick: handleCandleTick,
    onTransaction: handleNewTx,
    onPriceUpdate: handlePriceUpdate,
    onTpCreated: (data) => { if (data.wallet === address) setTpOrders((prev) => [...prev, data.order]); },
    onTpUpdated: (data) => { if (data.wallet === address) setTpOrders((prev) => prev.map((o) => o.id === data.order.id ? data.order : o)); },
    onTpCancelled: (data) => { if (data.wallet === address) setTpOrders((prev) => prev.filter((o) => o.id !== data.orderId)); },
    onTpExecuted: (data) => {
      if (data.wallet === address) {
        setTpOrders((prev) => prev.filter((o) => o.id !== data.orderId));
        setPortfolio((prev) => prev ? { ...prev, balance: (prev.balance || 0) - (data.amount || 0) } : prev);
      }
    },
  });

  const registerCandleCallback = useCallback((cb) => {
    candleCallbackRef.current = cb;
    return () => { candleCallbackRef.current = null; };
  }, []);

  const registerTickCallback = useCallback((cb) => {
    tickCallbackRef.current = cb;
    return () => { tickCallbackRef.current = null; };
  }, []);

  async function cancelOrder(orderId) {
    await fetch(`${API}/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: address }),
    });
    setTpOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!token || token.error) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Token not found</div>;

  const change = Number(token.change_24h);
  const TON_PRICE = 5.2;
  const priceInTon = price ? (price / TON_PRICE).toFixed(8) : '—';
  const ath = candles.length ? Math.max(...candles.map(c => c.high)) : price;
  const liquidity = token.market_cap ? fmtMC(token.market_cap * 0.15) : '—';
  const hasPosition = portfolio && portfolio.balance > 0;

  const stats = [
    ['Market Cap', fmtMC(token.market_cap)],
    ['24h Volume', fmtMC(token.volume_24h || 0)],
    ['Liquidity', liquidity],
    ['ATH', `$${fmt(ath)}`],
    ['Holders', Number(token.holders || 0).toLocaleString()],
    ['Price/TON', `${priceInTon} TON`],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 52px)', paddingBottom: '74px' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => navigate('/')} style={{ color: 'var(--text-secondary)', background: 'none', fontSize: '18px' }}>←</button>
          {token.image
            ? <img src={token.image} alt={token.symbol} style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
            : <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>{token.symbol[0]}</div>
          }
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{token.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{token.symbol} · TON Network</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)' }}>${fmt(price)}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '1px' }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
          {stats.map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-card)', borderRadius: '7px', padding: '5px 8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My Position (if wallet connected and has holding) */}
      {connected && hasPosition && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(124,94,247,0.06)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            📊 My Position
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
            {[
              ['Holdings', `${portfolio.balance.toFixed(2)} ${token.symbol}`],
              ['Avg Buy', `$${fmt(portfolio.avg_buy_price)}`],
              ['Value', `$${(portfolio.balance * (price || 0)).toFixed(4)}`],
              ['PnL', (() => {
                const pnl = portfolio.avg_buy_price
                  ? ((price - portfolio.avg_buy_price) / portfolio.avg_buy_price * 100)
                  : 0;
                return <span style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%</span>;
              })()],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-card)', borderRadius: '7px', padding: '5px 8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{val}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setEditOrder(null); setShowTpModal(true); }}
            style={{ width: '100%', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.4)' }}
          >
            🎯 Set Take-Profit Target
          </button>
        </div>
      )}

      {/* Active TP Orders */}
      {tpOrders.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            🎯 Active Take-Profit Orders
          </div>
          {tpOrders.map((order) => {
            const pnlPct = order.avg_buy_price ? ((order.target_price - order.avg_buy_price) / order.avg_buy_price * 100) : 0;
            return (
              <div key={order.id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f5a623' }}>
                    @ ${fmt(order.target_price)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {order.amount.toFixed(2)} {token.symbol} · +{pnlPct.toFixed(1)}% target
                  </div>
                </div>
                <button
                  onClick={() => { setEditOrder(order); setShowTpModal(true); }}
                  style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => cancelOrder(order.id)}
                  style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,68,102,0.1)', border: '1px solid rgba(255,68,102,0.3)', color: 'var(--red)' }}
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: '240px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <TradingChart candles={candles} onNewCandle={registerCandleCallback} onCandleTick={registerTickCallback} tpOrders={tpOrders} />
      </div>

      {/* Transactions */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🔄 Live Transactions
        </div>
        <TransactionFeed txns={txns} symbol={token.symbol} newestId={newestTxId} />
      </div>

      {/* Sticky bottom buttons */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 14px', display: 'flex', gap: '8px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', zIndex: 50 }}>
        <button onClick={() => setShowModal('buy')} style={{ flex: 2, padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', background: 'var(--green)', color: '#fff' }}>
          Buy
        </button>
        {hasPosition && (
          <button onClick={() => { setEditOrder(null); setShowTpModal(true); }} style={{ flex: 1, padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.4)' }}>
            TP
          </button>
        )}
        <button onClick={() => setShowModal('sell')} style={{ flex: 2, padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', background: 'var(--red)', color: '#fff' }}>
          Sell
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
            if (tx.type === 'buy') {
              fetch(`${API}/api/tokens/${id}/portfolio/${address}`).then((r) => r.json()).then(setPortfolio).catch(() => {});
            }
          }}
        />
      )}

      {showTpModal && (
        <TpOrderModal
          token={{ ...token, price }}
          portfolio={portfolio}
          editOrder={editOrder}
          onClose={() => { setShowTpModal(false); setEditOrder(null); }}
          onSuccess={(order) => {
            if (editOrder) {
              setTpOrders((prev) => prev.map((o) => o.id === order.id ? order : o));
            } else {
              setTpOrders((prev) => [...prev, order]);
            }
          }}
        />
      )}
    </div>
  );
}
