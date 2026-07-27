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
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="6" width="20" height="14" rx="2" stroke="var(--accent)" strokeWidth="1.5"/>
            <path d="M2 10h20" stroke="var(--accent)" strokeWidth="1.5"/>
            <circle cx="16" cy="15" r="1.5" fill="var(--accent)"/>
            <path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
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
          <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--green)" strokeWidth="1.5"/><path d="M8 12l3 3 5-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Take-Profit Executed
          </div>
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
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '9px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4" height="7" rx="1" fill="var(--accent)"/><rect x="10" y="9" width="4" height="12" rx="1" fill="var(--accent)"/><rect x="17" y="4" width="4" height="17" rx="1" fill="var(--accent)"/></svg>
            My Portfolio
          </div>
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
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No closed positions yet.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((o) => {
                const isTP      = o.kind === 'tp';
                const pnlUsd    = Number(o.pnl_usd  || 0);
                const pnlTon    = Number(o.pnl_ton  || 0);
                const received  = Number((o.amount * o.executed_price) / TON_PRICE).toFixed(4);
                const pnlColor  = pnlUsd >= 0 ? 'var(--green)' : 'var(--red)';
                return (
                  <div key={`${o.kind}-${o.id}`} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {o.image && <img src={o.image} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
                        <div style={{ fontWeight: 700 }}>{o.name} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({o.symbol})</span></div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isTP ? 'rgba(245,166,35,0.15)' : 'rgba(255,68,102,0.12)', color: isTP ? '#f5a623' : 'var(--red)' }}>
                        {isTP
                          ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f5a623" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#f5a623" strokeWidth="2"/><circle cx="12" cy="12" r="1.5" fill="#f5a623"/></svg> TP</>
                          : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M19 12l-7 7-7-7" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg> Sold</>
                        }
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                      {[
                        ['Sold @',    `$${fmt(o.executed_price)}`],
                        ['Amount',    `${Number(o.amount).toFixed(2)} ${o.symbol}`],
                        ['Received',  `${received} TON`],
                        ['Avg Entry', `$${fmt(o.avg_buy_price)}`],
                        ['PnL USD',   `${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(4)}`],
                        ['PnL TON',   `${pnlTon >= 0 ? '+' : ''}${pnlTon.toFixed(4)}`],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>{label}</div>
                          <div style={{
                            fontFamily: 'var(--font-mono)', fontWeight: 600,
                            color: label.startsWith('PnL') ? pnlColor : 'var(--text-primary)',
                          }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
      )}
    </div>
  );
}
