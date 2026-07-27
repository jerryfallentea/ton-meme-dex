import { useState } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';

const API = import.meta.env.VITE_API_URL || '';

function fmt(p) {
  if (!p) return '0';
  if (p < 0.000001) return p.toExponential(4);
  if (p < 0.001) return p.toFixed(8);
  return p.toFixed(6);
}

const PRESETS = [25, 50, 75, 100];

const overlay = {
  position: 'fixed', inset: 0, zIndex: 300,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};
const sheet = {
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border)',
  borderRadius: '16px 16px 0 0',
  width: '100%', maxWidth: '480px',
  padding: '20px',
  animation: 'slideIn 0.25s ease',
};
const inputStyle = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
};

function TargetIcon({ size = 15, color = '#f5a623' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"  stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="4"  stroke={color} strokeWidth="1.5"/>
      <line x1="12" y1="3"  x2="12" y2="7"  stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3"  y1="12" x2="7"  y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function TpOrderModal({ token, portfolio, onClose, onSuccess, editOrder }) {
  const { connected, address, connect } = useTonConnect();
  const currentPrice = token?.price || 0;
  const holding      = portfolio?.balance || 0;

  const [targetPrice, setTargetPrice] = useState(editOrder?.target_price || '');
  const [percentage, setPercentage]   = useState(editOrder ? Math.round((editOrder.amount / holding) * 100) : 50);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const amount         = (holding * percentage) / 100;
  const projectedUsd   = amount * (parseFloat(targetPrice) || 0);
  const projectedPnl   = projectedUsd - amount * (portfolio?.avg_buy_price || 0);
  const projectedPnlPct = portfolio?.avg_buy_price
    ? (((parseFloat(targetPrice) || 0) - portfolio.avg_buy_price) / portfolio.avg_buy_price) * 100
    : 0;

  async function handleSubmit() {
    if (!connected) return connect();
    if (!targetPrice || parseFloat(targetPrice) <= currentPrice) {
      return setError('Target price must be above current price');
    }
    if (!amount || amount <= 0) return setError('Amount must be greater than 0');

    setLoading(true); setError('');
    try {
      const url    = editOrder ? `${API}/api/orders/${editOrder.id}` : `${API}/api/orders`;
      const method = editOrder ? 'PUT' : 'POST';
      const body   = editOrder
        ? { wallet: address, target_price: parseFloat(targetPrice), amount, percentage }
        : { wallet: address, token_id: token.id, target_price: parseFloat(targetPrice), amount, percentage };

      const r    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onSuccess?.(data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sheet}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px' }}>
            <TargetIcon />
            {editOrder ? 'Edit' : 'Set'} Take-Profit — {token?.symbol}
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '20px' }}>×</button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Current Price</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${fmt(currentPrice)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>You Hold</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{holding.toLocaleString()} {token?.symbol}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Avg Buy</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${fmt(portfolio?.avg_buy_price)}</div>
          </div>
        </div>

        {/* Target price */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Target Price (USD) *
          </label>
          <input
            type="number" step="any" value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder={`Above $${fmt(currentPrice)}`}
            style={inputStyle}
          />
        </div>

        {/* Sell % slider */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Sell Amount — {percentage}% ({amount.toFixed(2)} {token?.symbol})
          </label>
          <input
            type="range" min="1" max="100" value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f5a623', marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setPercentage(p)}
                style={{
                  flex: 1, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  background: percentage === p ? '#f5a623' : 'var(--bg-hover)',
                  color: percentage === p ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${percentage === p ? '#f5a623' : 'var(--border)'}`,
                }}
              >{p}%</button>
            ))}
          </div>
        </div>

        {/* PnL preview */}
        {targetPrice && parseFloat(targetPrice) > currentPrice && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Projected Value</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${projectedUsd.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Projected PnL</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: projectedPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {projectedPnl >= 0 ? '+' : ''}${projectedPnl.toFixed(4)} ({projectedPnlPct >= 0 ? '+' : ''}{projectedPnlPct.toFixed(2)}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>In TON</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ton)' }}>
                +{(projectedUsd / 5.2).toFixed(4)} TON
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px', padding: '8px', background: 'var(--red-dim)', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', background: 'var(--accent)', color: '#fff', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Saving…' : connected ? (editOrder ? 'Update Target' : 'Set Take-Profit') : 'Connect Wallet to Set TP'}
        </button>
      </div>
    </div>
  );
}
