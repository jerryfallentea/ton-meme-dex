import { useState, useEffect } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';

const API = import.meta.env.VITE_API_URL || '';
const TON_PRICE = 5.2;

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
  width: '100%', maxWidth: '480px',
  padding: '20px',
  animation: 'slideIn 0.25s ease',
};

export default function BuySellModal({ token, portfolio, onClose, onSuccess }) {
  const { connected, address, connect } = useTonConnect();
  const [tab, setTab]         = useState('buy');
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tonBalance, setTonBalance] = useState(0);

  const price   = token?.price || 0;
  const holding = portfolio?.balance || 0;
  const maxBuyTokens = tonBalance > 0 && price > 0
    ? ((tonBalance * TON_PRICE) / price)
    : 0;

  // Fetch TON balance so buy Max can use it
  useEffect(() => {
    if (!connected || !address) return;
    fetch(`${API}/api/orders/wallet/${address}`)
      .then((r) => r.json())
      .then((d) => setTonBalance(d.balance_ton || 0))
      .catch(() => {});
  }, [connected, address]);

  const total = (parseFloat(amount) || 0) * price;

  async function handleTrade() {
    if (!connected) return connect();
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount');
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/tokens/${token.id}/trade`, {
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

  const presetBtn = (active, color) => ({
    flex: 1, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
    background: active ? color : 'var(--bg-hover)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    transition: 'all 0.12s',
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
          <button style={tabStyle(tab === 'buy', 'var(--green)')} onClick={() => { setTab('buy'); setAmount(''); setError(''); }}>Buy</button>
          <button style={tabStyle(tab === 'sell', 'var(--red)')} onClick={() => { setTab('sell'); setAmount(''); setError(''); }}>Sell</button>
        </div>

        <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Current Price: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>${formatPrice(price)}</span>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Amount ({token?.symbol})
            </label>
            {tab === 'sell' && holding > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Balance: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {holding.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </span>
            )}
            {tab === 'buy' && tonBalance > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                TON Balance: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ton)' }}>
                  {tonBalance.toFixed(2)} TON
                </span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number" min="0" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1, padding: '10px 12px',
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
              }}
            />
            {/* Max button */}
            {tab === 'sell' && holding > 0 && (
              <button
                onClick={() => setAmount(String(holding))}
                style={{
                  padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                  background: 'rgba(255,68,102,0.12)', color: 'var(--red)',
                  border: '1px solid rgba(255,68,102,0.35)', flexShrink: 0,
                }}
              >Max</button>
            )}
            {tab === 'buy' && maxBuyTokens > 0 && (
              <button
                onClick={() => setAmount(maxBuyTokens.toFixed(2))}
                style={{
                  padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                  background: 'rgba(0,208,132,0.12)', color: 'var(--green)',
                  border: '1px solid rgba(0,208,132,0.35)', flexShrink: 0,
                }}
              >Max</button>
            )}
          </div>
        </div>

        {/* Quick % presets for sell */}
        {tab === 'sell' && holding > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[25, 50, 75].map((pct) => {
              const qty = (holding * pct) / 100;
              const active = amount === String(qty) || amount === qty.toFixed(2);
              return (
                <button key={pct} onClick={() => setAmount(qty.toFixed(2))}
                  style={presetBtn(active, 'var(--red)')}>
                  {pct}%
                </button>
              );
            })}
            <button
              onClick={() => setAmount(String(holding))}
              style={presetBtn(amount === String(holding), 'var(--red)')}>
              Max
            </button>
          </div>
        )}

        {amount && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total value</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${total.toFixed(6)}</span>
            </div>
            {tab === 'buy' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cost in TON</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ton)' }}>
                  {(total / TON_PRICE).toFixed(4)} TON
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px', padding: '8px', background: 'rgba(255,68,102,0.08)', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleTrade} disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: '10px',
            fontWeight: 700, fontSize: '15px',
            background: connected ? (tab === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--accent)',
            color: '#fff', opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
          }}
        >
          {loading ? 'Processing…' : connected ? `${tab === 'buy' ? 'Buy' : 'Sell'} ${token?.symbol}` : 'Connect Wallet to Trade'}
        </button>
      </div>
    </div>
  );
}
