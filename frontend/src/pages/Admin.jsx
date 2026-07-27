import { useEffect, useState } from 'react';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'symbol', label: 'Symbol', type: 'text', required: true },
  { key: 'image', label: 'Image URL', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'price', label: 'Initial Price (USD)', type: 'number', required: true, step: 'any' },
  { key: 'market_cap', label: 'Market Cap', type: 'number', step: 'any' },
  { key: 'volatility', label: 'Volatility (0.01–0.08)', type: 'number', step: '0.001', defaultVal: 0.02 },
  { key: 'trend_strength', label: 'Trend Strength (0.5–3)', type: 'number', step: '0.1', defaultVal: 1.0 },
  { key: 'pump_chance', label: 'Pump Chance (0–0.2)', type: 'number', step: '0.01', defaultVal: 0.05 },
  { key: 'tx_speed', label: 'TX Speed (ms between txns)', type: 'number', defaultVal: 3000 },
];

const inputStyle = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px',
};

export default function Admin() {
  const [key, setKey] = useState(sessionStorage.getItem('adminKey') || '');
  const [authed, setAuthed] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function headers() {
    return { 'Content-Type': 'application/json', 'x-admin-key': key };
  }

  async function login() {
    const r = await fetch('/api/admin/tokens', { headers: headers() });
    if (r.ok) {
      sessionStorage.setItem('adminKey', key);
      setAuthed(true);
      const data = await r.json();
      setTokens(data);
      fetch('/api/admin/stats', { headers: headers() }).then((r) => r.json()).then(setStats).catch(() => {});
    } else {
      setError('Invalid admin key');
    }
  }

  async function loadTokens() {
    const r = await fetch('/api/admin/tokens', { headers: headers() });
    if (r.ok) setTokens(await r.json());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    const url = editing ? `/api/admin/tokens/${editing}` : '/api/admin/tokens';
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
    const data = await r.json();
    if (!r.ok) return setError(data.error);
    setMsg(editing ? 'Token updated!' : 'Token created!');
    setForm({});
    setEditing(null);
    loadTokens();
  }

  async function deleteToken(id) {
    if (!confirm('Deactivate this token?')) return;
    await fetch(`/api/admin/tokens/${id}`, { method: 'DELETE', headers: headers() });
    loadTokens();
  }

  async function resetCandles(id) {
    await fetch(`/api/admin/tokens/${id}/reset-candles`, { method: 'POST', headers: headers() });
    setMsg('Candles reset!');
  }

  function startEdit(token) {
    setEditing(token.id);
    setForm({
      name: token.name, symbol: token.symbol, image: token.image,
      description: token.description, price: token.price, market_cap: token.market_cap,
      volatility: token.volatility, trend_strength: token.trend_strength,
      pump_chance: token.pump_chance, tx_speed: token.tx_speed,
    });
    window.scrollTo(0, 0);
  }

  if (!authed) {
    return (
      <div style={{ maxWidth: '360px', margin: '80px auto', padding: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>🔐 Admin Login</div>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="Enter admin key" style={{ ...inputStyle, marginBottom: '12px' }}
          onKeyDown={(e) => e.key === 'Enter' && login()}
        />
        {error && <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}
        <button onClick={login} style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: '#fff', borderRadius: '8px', fontWeight: 700 }}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>⚙️ Admin Panel</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Manage tokens and platform settings</div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            ['Tokens', stats.totalTokens],
            ['Transactions', stats.totalTxns],
            ['Volume', `$${Number(stats.totalVolume).toFixed(2)}`],
            ['Wallets', stats.uniqueWallets],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '15px' }}>{editing ? '✏️ Edit Token' : '➕ Add Token'}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {FIELDS.map(({ key: k, label, type, required, step, defaultVal }) => (
              <div key={k} style={{ gridColumn: type === 'textarea' ? '1 / -1' : 'auto' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {label}{required && ' *'}
                </label>
                {type === 'textarea'
                  ? <textarea value={form[k] || ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      style={{ ...inputStyle, height: '60px', resize: 'vertical' }} />
                  : <input type={type} required={required} step={step}
                      value={form[k] !== undefined ? form[k] : (defaultVal ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
                      style={inputStyle}
                    />
                }
              </div>
            ))}
          </div>
          {msg && <div style={{ color: 'var(--green)', fontSize: '12px', margin: '10px 0' }}>{msg}</div>}
          {error && <div style={{ color: 'var(--red)', fontSize: '12px', margin: '10px 0' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: '8px', fontWeight: 700 }}>
              {editing ? 'Save Changes' : 'Add Token'}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm({}); }}
                style={{ padding: '10px 16px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderRadius: '8px' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}>📋 Token List</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tokens.map((t) => (
          <div key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{t.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({t.symbol})</span></div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ${t.price} · vol={t.volatility} · trend={t.trend_strength} · {t.active ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => startEdit(t)} style={{ padding: '5px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>Edit</button>
              <button onClick={() => resetCandles(t.id)} style={{ padding: '5px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--accent)', fontSize: '12px' }}>Reset Chart</button>
              <button onClick={() => deleteToken(t.id)} style={{ padding: '5px 10px', background: 'rgba(255,68,102,0.1)', border: '1px solid rgba(255,68,102,0.3)', borderRadius: '6px', color: 'var(--red)', fontSize: '12px' }}>Disable</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
