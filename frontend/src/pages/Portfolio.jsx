import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnect } from '../hooks/useTonConnect';
import { useWalletSocket } from '../hooks/useSocket';

const API = import.meta.env.VITE_API_URL || '';
const TON_PRICE = 5.2;

function fmt(p) {
  if (!p || p === 0) return '$0';
  if (p < 0.000001) return p.toExponential(3);
  if (p < 0.001) return p.toFixed(8);
  return p.toFixed(6);
}

function fmtUsd(v) {
  if (!v) return '$0.00';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${Number(v).toFixed(4)}`;
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '14px',
};

export default function Portfolio() {
  const navigate = useNavigate();
  const { connected, address, connect, shortAddress } = useTonConnect();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('positions');
  const [notification, setNotification] = useState(null);

  function load() {
    if (!address) return;
    setLoading(true);
    fetch(`${API}/api/orders/portfolio/${address}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [address]);

  useWalletSocket(address, {
    onTpExecuted: (payload) => {
      setNotification(payload);
      setTimeout(() => setNotification(null), 6000);
      load();
    },
  });

  if (!connected) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👛</div>
        <div style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>Connect Your Wallet</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
          Connect your Tonkeeper wallet to view your positions, PnL, and take-profit orders.
        </div>
        <button onClick={connect} style={{ padding: '13px 32px', borderRadius: '10px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '15px' }}>
          Connect Wallet
        </button>
      </div>
    );
  }

  const holdings = data?.holdings || [];
  const openOrders = data?.openOrders || [];
  const history = data?.history || [];
  const balance = data?.balance || { balance_ton: 0, total_realized_pnl_usd: 0 };

  const totalValue = holdings.reduce((s, h) => s + (h.balance * (h.current_price || 0)), 0);
  const totalCost = holdings.reduce((s, h) => s + (h.balance * (h.avg_buy_price || 0)), 0);
  const unrealizedPnl = totalValue - totalCost;
  const unrealizedPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

  const tabStyle = (active) => ({
    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

      {/* TP Executed Notification */}
      {notification && (
        <div className="slide-in" style={{ padding: '12px 16px', background: 'rgba(0,208,132,0.1)', border: '1px solid var(--green)', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>🎯 Take-Profit Executed!</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Sold {notification.amount} {notification.symbol} @ ${notification.executed_price?.toExponential(3)}
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>+{notification.proceeds_ton} TON</span>
            <span style={{ color: notification.pnl_usd >= 0 ? 'var(--green)' : 'var(--red)', marginLeft: '10px' }}>
              PnL: {notification.pnl_usd >= 0 ? '+' : ''}${notification.pnl_usd?.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>📊 My Portfolio</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{shortAddress}</div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ ...card }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Portfolio Value</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px' }}>{fmtUsd(totalValue)}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: unrealizedPnl >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
            {unrealizedPnl >= 0 ? '+' : ''}{fmtUsd(unrealizedPnl)} ({unrealizedPct >= 0 ? '+' : ''}{unrealizedPct.toFixed(2)}%)
          </div>
        </div>
        <div style={{ ...card }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>TON Balance</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px', color: 'var(--ton)' }}>
            {Number(balance.balance_ton).toFixed(4)} TON
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Realized PnL: <span style={{ color: balance.total_realized_pnl_usd >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {balance.total_realized_pnl_usd >= 0 ? '+' : ''}${Number(balance.total_realized_pnl_usd).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        <button style={tabStyle(tab === 'positions')} onClick={() => setTab('positions')}>
          Positions ({holdings.length})
        </button>
        <button style={tabStyle(tab === 'orders')} onClick={() => setTab('orders')}>
          TP Orders ({openOrders.length})
        </button>
        <button style={tabStyle(tab === 'history')} onClick={() => setTab('history')}>
          History ({history.length})
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading…</div>}

      {/* Positions */}
      {!loading && tab === 'positions' && (
        holdings.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No open positions.<br />Buy some tokens to get started!</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {holdings.map((h) => {
                const value = h.balance * (h.current_price || 0);
                const pnl = ((h.current_price - h.avg_buy_price) / h.avg_buy_price) * 100;
                return (
                  <div key={h.token_id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/token/${h.token_id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {h.image && <img src={h.image} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{h.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '12px' }}>({h.symbol})</span></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {h.balance.toFixed(2)} tokens · Avg ${fmt(h.avg_buy_price)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmtUsd(value)}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {/* Open TP Orders */}
      {!loading && tab === 'orders' && (
        openOrders.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No active take-profit orders.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {openOrders.map((o) => {
                const pnlPct = o.avg_buy_price ? ((o.target_price - o.avg_buy_price) / o.avg_buy_price * 100) : 0;
                const projectedTon = (o.amount * o.target_price) / TON_PRICE;
                return (
                  <div key={o.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 700 }}>{o.name} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({o.symbol})</span></div>
                      <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(245,166,35,0.15)', color: '#f5a623', borderRadius: '4px', fontWeight: 600 }}>TP</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                      {[
                        ['Target', `$${fmt(o.target_price)}`],
                        ['Amount', `${o.amount.toFixed(2)} ${o.symbol}`],
                        ['Est. PnL', `+${pnlPct.toFixed(1)}%`],
                        ['Curr. Price', `$${fmt(o.current_price)}`],
                        ['Avg Buy', `$${fmt(o.avg_buy_price)}`],
                        ['Est. TON', `+${projectedTon.toFixed(4)}`],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: label === 'Est. PnL' || label === 'Est. TON' ? 'var(--green)' : 'var(--text-primary)' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {/* History */}
      {!loading && tab === 'history' && (
        history.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No executed orders yet.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((o) => (
                <div key={o.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 700 }}>{o.name} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({o.symbol})</span></div>
                    <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>✓ Executed</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                    {[
                      ['Sold @ ', `$${fmt(o.executed_price)}`],
                      ['Amount', `${o.amount.toFixed(2)} ${o.symbol}`],
                      ['PnL USD', `${o.pnl_usd >= 0 ? '+' : ''}$${Number(o.pnl_usd).toFixed(4)}`],
                      ['Target was', `$${fmt(o.target_price)}`],
                      ['Received', `${Number(o.pnl_ton + (o.amount * o.executed_price / TON_PRICE)).toFixed(4)} TON`],
                      ['PnL TON', `${o.pnl_ton >= 0 ? '+' : ''}${Number(o.pnl_ton).toFixed(4)}`],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: label.startsWith('PnL') ? (o.pnl_usd >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-primary)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
