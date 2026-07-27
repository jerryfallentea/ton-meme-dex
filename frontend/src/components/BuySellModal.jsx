import { useState } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';

function formatPrice(p) {
  if (!p) return '0';
  if (p < 0.000001) return p.toExponential(4);
  if (p < 0.001) return p.toFixed(8);
  return p.toFixed(6);
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet = {
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border)',
  borderRadius: '16px 16px 0 0',
  width: '100%',
  maxWidth: '480px',
  padding: '20px',
  animation: 'slideIn 0.25s ease',
};

export default function BuySellModal({ token, onClose, onSuccess }) {
  const { connected, address, connect } = useTonConnect();
  const [tab, setTab] = useState('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const price = token?.price || 0;
  const total = (parseFloat(amount) || 0) * price;

  async function handleTrade() {
    if (!connected) return connect();
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tokens/${token.id}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, type: tab, amount: parseFloat(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.(data.transaction);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (active, color) => ({
    flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
    background: active ? color : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    transition: 'all 0.15s',
  });

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>
            {tab === 'buy' ? '🛒 Buy' : '💸 Sell'} {token?.symbol}
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button style={tabStyle(tab === 'buy', 'var(--green)')} onClick={() => setTab('buy')}>Buy</button>
          <button style={tabStyle(tab === 'sell', 'var(--red)')} onClick={() => setTab('sell')}>Sell</button>
        </div>

        <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Current Price: <span className="mono" style={{ color: 'var(--text-primary)' }}>${formatPrice(price)}</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Amount ({token?.symbol})
          </label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: '100%', padding: '10px 12px',
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
            }}
          />
        </div>

        {amount && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total: </span>
            <span className="mono" style={{ fontWeight: 600 }}>${total.toFixed(6)} USDT equiv.</span>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px', padding: '8px', background: 'var(--red-dim)', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleTrade}
          disabled={loading}
          style={{
            width: '100%', padding: '13px',
            borderRadius: '10px', fontWeight: 700, fontSize: '15px',
            background: connected
              ? (tab === 'buy' ? 'var(--green)' : 'var(--red)')
              : 'var(--accent)',
            color: '#fff',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Processing…' : connected ? `${tab === 'buy' ? 'Buy' : 'Sell'} ${token?.symbol}` : 'Connect Wallet to Trade'}
        </button>
      </div>
    </div>
  );
}
