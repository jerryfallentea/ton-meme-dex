import { useState, useEffect } from 'react';
import { useTonConnect } from '../hooks/useTonConnect';

const API = import.meta.env.VITE_API_URL || '';

function fmt(p) {
  if (!p) return '0';
  if (p < 0.000001) return p.toExponential(4);
  if (p < 0.001) return p.toFixed(8);
  return p.toFixed(6);
}
function fmtMC(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Number(v).toFixed(0)}`;
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};
const sheet = {
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border)',
  borderRadius: '16px 16px 0 0',
  width: '100%', maxWidth: '480px',
  maxHeight: '88vh',
  display: 'flex', flexDirection: 'column',
  animation: 'slideIn 0.25s ease',
};
const inputStyle = {
  width: '100%', padding: '11px 12px',
  background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
  outline: 'none',
};
const USD_PRESETS = [10, 50, 100, 500];
const TP_PRESETS  = [25, 50, 75, 100];
const TON_PRICE   = 5.2;

// ── Icon components ────────────────────────────────────────────────────────────
function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function ArrowUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--green)" strokeWidth="1.5"/>
      <path d="M8 12l3 3 5-6" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"  stroke="#f5a623" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="4"  stroke="#f5a623" strokeWidth="1.5"/>
      <line x1="12" y1="3"  x2="12" y2="7"  stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3"  y1="12" x2="7"  y2="12" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17" y1="12" x2="21" y2="12" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke="var(--text-muted)" strokeWidth="1.8"/>
      <path d="M21 21l-4.35-4.35" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function TradeModal({ onClose }) {
  const { connected, address, connect } = useTonConnect();

  const [step, setStep]               = useState('pick');
  const [tokens, setTokens]           = useState([]);
  const [search, setSearch]           = useState('');
  const [loadingTokens, setLoadingTokens] = useState(true);

  const [selectedToken, setSelectedToken] = useState(null);
  const [tradeTab, setTradeTab]       = useState('buy');
  const [usdAmount, setUsdAmount]     = useState('');
  const [sellPct, setSellPct]         = useState(50);
  const [portfolio, setPortfolio]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [tradeError, setTradeError]   = useState('');
  const [lastTx, setLastTx]           = useState(null);

  const [tonBalance, setTonBalance]   = useState(0);
  const [tpPrice, setTpPrice]         = useState('');
  const [tpPct, setTpPct]             = useState(50);
  const [tpLoading, setTpLoading]     = useState(false);
  const [tpError, setTpError]         = useState('');

  useEffect(() => {
    fetch(`${API}/api/tokens`)
      .then((r) => r.json())
      .then((data) => { setTokens(data); setLoadingTokens(false); })
      .catch(() => setLoadingTokens(false));
  }, []);

  useEffect(() => {
    if (!selectedToken || !connected || !address) return;
    fetch(`${API}/api/tokens/${selectedToken.id}/portfolio/${address}`)
      .then((r) => r.json()).then(setPortfolio).catch(() => {});
  }, [selectedToken, connected, address]);

  useEffect(() => {
    if (!connected || !address) return;
    fetch(`${API}/api/orders/wallet/${address}`)
      .then((r) => r.json())
      .then((d) => setTonBalance(d.balance_ton || 0))
      .catch(() => {});
  }, [connected, address]);

  const price      = selectedToken?.price || 0;
  const buyTokens  = price > 0 ? (parseFloat(usdAmount) || 0) / price : 0;
  const holding    = portfolio?.balance || 0;
  const sellTokens = (holding * sellPct) / 100;
  const sellUsd    = sellTokens * price;

  const filtered = tokens.filter((t) => {
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q);
  });

  function selectToken(token) {
    setSelectedToken(token);
    setTradeTab('buy');
    setUsdAmount('');
    setSellPct(50);
    setTradeError('');
    setLastTx(null);
    setPortfolio(null);
    setStep('trade');
  }

  async function handleTrade() {
    if (!connected) return connect();
    const qty = tradeTab === 'buy' ? buyTokens : sellTokens;
    if (!qty || qty <= 0) return setTradeError('Enter a valid amount');

    setSubmitting(true); setTradeError('');
    try {
      const r = await fetch(`${API}/api/tokens/${selectedToken.id}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, type: tradeTab, amount: qty }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Trade failed');
      setLastTx(data.transaction);
      if (tradeTab === 'buy') {
        setTpPrice(''); setTpPct(50); setTpError('');
        setStep('tp');
      } else {
        onClose();
      }
    } catch (e) {
      setTradeError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetTp() {
    if (!tpPrice || parseFloat(tpPrice) <= price) {
      return setTpError('Target must be above current price');
    }
    setTpLoading(true); setTpError('');
    const boughtQty = lastTx?.amount || 0;
    const tpAmount  = (boughtQty * tpPct) / 100;
    try {
      const r = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, token_id: selectedToken.id, target_price: parseFloat(tpPrice), amount: tpAmount, percentage: tpPct }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to set TP');
      onClose();
    } catch (e) {
      setTpError(e.message);
    } finally {
      setTpLoading(false);
    }
  }

  const boughtQty = lastTx?.amount || 0;
  const tpAmount  = (boughtQty * tpPct) / 100;
  const tpUsd     = tpAmount * (parseFloat(tpPrice) || 0);
  const costBasis = tpAmount * (lastTx?.price || price);
  const tpPnl     = tpUsd - costBasis;
  const tpPnlPct  = costBasis > 0 ? (tpPnl / costBasis) * 100 : 0;

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sheet}>

        {/* ── STEP 1: Token Picker ─────────────────────────────────────── */}
        {step === 'pick' && (
          <>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px' }}>
                  <ZapIcon /> Quick Trade
                </div>
                <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '22px', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <SearchIcon />
                </span>
                <input
                  autoFocus
                  style={{ ...inputStyle, paddingLeft: '34px' }}
                  placeholder="Search token…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingTokens ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
              ) : filtered.map((token) => {
                const change = Number(token.change_24h);
                return (
                  <button key={token.id} onClick={() => selectToken(token)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                    {token.image
                      ? <img src={token.image} alt={token.symbol} style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0 }} />
                      : <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{token.symbol[0]}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{token.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{token.symbol} · {fmtMC(token.market_cap)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>${fmt(token.price)}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── STEP 2: Trade ───────────────────────────────────────────── */}
        {step === 'trade' && selectedToken && (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setStep('pick')} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>←</button>
                {selectedToken.image
                  ? <img src={selectedToken.image} alt={selectedToken.symbol} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>{selectedToken.symbol[0]}</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedToken.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>${fmt(price)}</div>
                </div>
                <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '22px', lineHeight: 1 }}>×</button>
              </div>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Buy / Sell tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { key: 'buy',  label: 'Buy',  icon: <ArrowUpIcon />,   color: 'var(--green)' },
                  { key: 'sell', label: 'Sell', icon: <ArrowDownIcon />, color: 'var(--red)'   },
                ].map(({ key, label, icon, color }) => (
                  <button key={key} onClick={() => { setTradeTab(key); setTradeError(''); }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: tradeTab === key ? color : 'transparent',
                      color: tradeTab === key ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${tradeTab === key ? color : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}
                  >{icon} {label}</button>
                ))}
              </div>

              {tradeTab === 'buy' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spend (USD)</label>
                    {tonBalance > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        TON Balance: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ton)' }}>{tonBalance.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input type="number" min="0" value={usdAmount} onChange={(e) => setUsdAmount(e.target.value)} placeholder="0.00" style={{ ...inputStyle, flex: 1 }} />
                    {tonBalance > 0 && price > 0 && (
                      <button onClick={() => setUsdAmount((tonBalance * TON_PRICE).toFixed(2))}
                        style={{ padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', background: 'rgba(0,208,132,0.12)', color: 'var(--green)', border: '1px solid rgba(0,208,132,0.35)', flexShrink: 0 }}>
                        Max
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    {USD_PRESETS.map((p) => (
                      <button key={p} onClick={() => setUsdAmount(String(p))}
                        style={{ flex: 1, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: usdAmount === String(p) ? 'var(--green)' : 'var(--bg-hover)', color: usdAmount === String(p) ? '#fff' : 'var(--text-secondary)', border: `1px solid ${usdAmount === String(p) ? 'var(--green)' : 'var(--border)'}` }}>
                        ${p}
                      </button>
                    ))}
                  </div>
                  {buyTokens > 0 && (
                    <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>You receive</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                          {buyTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedToken.symbol}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Your Balance</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {holding > 0 ? `${holding.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${selectedToken.symbol}` : 'No position'}
                    </div>
                  </div>
                  {holding > 0 && (
                    <>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Sell {sellPct}% — {sellTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedToken.symbol} (${sellUsd.toFixed(4)})
                      </label>
                      <input type="range" min="1" max="100" value={sellPct} onChange={(e) => setSellPct(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--red)', marginBottom: '8px' }} />
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                        {[25, 50, 75].map((p) => (
                          <button key={p} onClick={() => setSellPct(p)}
                            style={{ flex: 1, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: sellPct === p ? 'var(--red)' : 'var(--bg-hover)', color: sellPct === p ? '#fff' : 'var(--text-secondary)', border: `1px solid ${sellPct === p ? 'var(--red)' : 'var(--border)'}` }}>
                            {p}%
                          </button>
                        ))}
                        <button onClick={() => setSellPct(100)}
                          style={{ flex: 1, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: sellPct === 100 ? 'var(--red)' : 'var(--bg-hover)', color: sellPct === 100 ? '#fff' : 'var(--text-secondary)', border: `1px solid ${sellPct === 100 ? 'var(--red)' : 'var(--border)'}` }}>
                          Max
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {tradeError && (
                <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px', padding: '8px', background: 'rgba(255,68,102,0.08)', borderRadius: '6px' }}>
                  {tradeError}
                </div>
              )}

              <button onClick={handleTrade} disabled={submitting}
                style={{ width: '100%', padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', color: '#fff', background: connected ? (tradeTab === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--accent)', opacity: submitting ? 0.6 : 1, transition: 'all 0.15s' }}>
                {submitting ? 'Processing…' : connected ? `${tradeTab === 'buy' ? 'Buy' : 'Sell'} ${selectedToken.symbol}` : 'Connect Wallet to Trade'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Set Take-Profit ──────────────────────────────────── */}
        {step === 'tp' && selectedToken && lastTx && (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px' }}>
                  <TargetIcon /> Set Take-Profit
                </div>
                <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '22px', lineHeight: 1 }}>×</button>
              </div>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Success badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.25)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                <div style={{ flexShrink: 0, marginTop: '1px' }}><CheckCircleIcon /></div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '3px' }}>Position Opened</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Bought {boughtQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedToken.symbol} @ ${fmt(lastTx.price)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Target Price (USD) — above ${fmt(price)}
                </label>
                <input type="number" step="any" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} placeholder={`e.g. ${(price * 1.5).toExponential(3)}`} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Sell {tpPct}% of position — {tpAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedToken.symbol}
                </label>
                <input type="range" min="1" max="100" value={tpPct} onChange={(e) => setTpPct(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TP_PRESETS.map((p) => (
                    <button key={p} onClick={() => setTpPct(p)}
                      style={{ flex: 1, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: tpPct === p ? 'var(--accent)' : 'var(--bg-hover)', color: tpPct === p ? '#fff' : 'var(--text-secondary)', border: `1px solid ${tpPct === p ? 'var(--accent)' : 'var(--border)'}` }}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {tpPrice && parseFloat(tpPrice) > price && (
                <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Projected value</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${tpUsd.toFixed(4)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Projected PnL</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: tpPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {tpPnl >= 0 ? '+' : ''}${tpPnl.toFixed(4)} ({tpPnlPct >= 0 ? '+' : ''}{tpPnlPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>In TON</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ton)' }}>+{(tpUsd / 5.2).toFixed(4)} TON</span>
                  </div>
                </div>
              )}

              {tpError && (
                <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px', padding: '8px', background: 'rgba(255,68,102,0.08)', borderRadius: '6px' }}>
                  {tpError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSetTp} disabled={tpLoading}
                  style={{ flex: 2, padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent)', color: '#fff', opacity: tpLoading ? 0.6 : 1 }}>
                  <TargetIcon /> {tpLoading ? 'Saving…' : 'Set Take-Profit'}
                </button>
                <button onClick={onClose}
                  style={{ flex: 1, padding: '13px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Skip
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
