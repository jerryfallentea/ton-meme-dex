const db = require('../db/database');

// In-memory forming candles — one per active token
// shape: { time, open, high, low, close, volume }
// "time" = candle open-time (same field lightweight-charts uses)
const liveCandles = new Map();
let _io = null;

// ─── Historical generation (used only by seedCandlesForToken) ─────────────────

function generateCandle(prevClose, personality, time) {
  const { id, volatility, trend_strength, pump_chance } = personality;

  const phaseOffset = (id * 2.618033988) % (Math.PI * 2);
  const cyclePeriod = 900 * (30 + ((id * 13) % 38));

  const macroDrift = 0.00016 * trend_strength;
  const cycleValue = Math.sin((time / cyclePeriod) + phaseOffset);
  const cycleDrift = 0.0007 * trend_strength * cycleValue;
  const noise      = (Math.random() - 0.5) * 2.0 * volatility;
  const pump       = Math.random() < pump_chance            ? Math.random() * 0.045 * trend_strength : 0;
  const dump       = Math.random() < pump_chance * 0.60     ? -(Math.random() * 0.03)               : 0;

  const changePercent = macroDrift + cycleDrift + noise + pump + dump;
  const open  = prevClose;
  const close = Math.max(open * (1 + changePercent), 0.000001);

  const bodyRange = Math.abs(close - open);
  const high = Math.max(open, close) + bodyRange * (0.3 + Math.random() * 0.9) * Math.random();
  const low  = Math.min(open, close) - bodyRange * (0.2 + Math.random() * 0.7) * Math.random();

  const baseVol = prevClose * 50000;
  const volume  = baseVol * (0.5 + Math.random() * 1.5) * (1 + pump * 10 + Math.abs(dump) * 5);

  return { time, open, high, low, close: Number(close.toFixed(8)), volume: Number(volume.toFixed(2)) };
}

function generateHistoricalCandles(token, count) {
  const personality = {
    id: token.id, volatility: token.volatility,
    trend_strength: token.trend_strength, pump_chance: token.pump_chance,
  };
  const now       = Math.floor(Date.now() / 1000);
  const interval  = token.candle_interval;
  const startTime = now - count * interval;

  const candles = [];
  let price = token.initial_price;
  for (let i = 0; i < count; i++) {
    const time   = startTime + i * interval;
    const candle = generateCandle(price, personality, time);
    candles.push(candle);
    price = candle.close;
  }
  return candles;
}

function seedCandlesForToken(token) {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM candlesticks WHERE token_id = ?').get(token.id);
  if (existing.cnt > 0) return;

  const candles    = generateHistoricalCandles(token, 300);
  const lastCandle = candles[candles.length - 1];

  const insert = db.prepare(
    'INSERT OR IGNORE INTO candlesticks (token_id, time, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((rows) => {
    for (const c of rows) insert.run(token.id, c.time, c.open, c.high, c.low, c.close, c.volume);
  });
  insertMany(candles);

  const change24h = ((lastCandle.close - candles[0].open) / candles[0].open) * 100;
  db.prepare('UPDATE tokens SET price = ?, change_24h = ? WHERE id = ?').run(lastCandle.close, change24h, token.id);
}

// ─── Live forming-candle system ───────────────────────────────────────────────

function initLiveCandle(tokenId, openPrice, candleOpenTime) {
  liveCandles.set(tokenId, {
    time:   candleOpenTime,
    open:   openPrice,
    high:   openPrice,
    low:    openPrice,
    close:  openPrice,
    volume: 0,
  });
}

// Called by txSimulator after each transaction — moves the forming candle
function updateLiveCandle(tokenId, newPrice, addedVolume) {
  const live = liveCandles.get(tokenId);
  if (!live || !_io) return;

  live.close  = Number(Math.max(newPrice, 0.000001).toFixed(12));
  live.high   = Math.max(live.high, live.close);
  live.low    = Math.min(live.low,  live.close);
  live.volume = Number((live.volume + (addedVolume || 0)).toFixed(2));

  _io.to(`token:${tokenId}`).emit('candle-tick', { tokenId, candle: { ...live } });
}

// Called every 2 s — applies scaled GBM so the forming candle looks alive
function tickLiveCandle(token) {
  const live = liveCandles.get(token.id);
  if (!live || !_io) return;

  const { id, volatility, trend_strength, pump_chance, candle_interval } = token;
  const phaseOffset    = (id * 2.618033988) % (Math.PI * 2);
  const cyclePeriod    = 900 * (30 + ((id * 13) % 38));
  const now            = Math.floor(Date.now() / 1000);
  const ticksPerCandle = Math.max(candle_interval / 2, 1); // 2-second ticks

  // GBM scaled to tick frequency: std-dev ∝ 1/√N so candle-level σ is preserved
  const macroDrift = (0.00016 * trend_strength) / ticksPerCandle;
  const cycleVal   = Math.sin((now / cyclePeriod) + phaseOffset);
  const cycleDrift = (0.0007 * trend_strength * cycleVal) / ticksPerCandle;
  const noise      = (Math.random() - 0.5) * 2.0 * volatility / Math.sqrt(ticksPerCandle);
  const pumpProb   = pump_chance / ticksPerCandle;
  const pump       = Math.random() < pumpProb           ? Math.random() * 0.045 * trend_strength : 0;
  const dump       = Math.random() < pumpProb * 0.60    ? -(Math.random() * 0.03)               : 0;

  const change   = macroDrift + cycleDrift + noise + pump + dump;
  const newClose = Math.max(live.close * (1 + change), 0.000001);

  live.close = Number(newClose.toFixed(12));
  live.high  = Math.max(live.high, live.close);
  live.low   = Math.min(live.low,  live.close);

  _io.to(`token:${token.id}`).emit('candle-tick', { tokenId: token.id, candle: { ...live } });
}

// ─── Candle closing (called every 10 s) ──────────────────────────────────────

function buildNextCandle(token) {
  // Auto-init if the live candle is missing (new token added after startup)
  if (!liveCandles.has(token.id)) {
    const lastRow = db.prepare('SELECT * FROM candlesticks WHERE token_id = ? ORDER BY time DESC LIMIT 1').get(token.id);
    if (!lastRow) return null;
    initLiveCandle(token.id, lastRow.close, lastRow.time + token.candle_interval);
  }

  const live    = liveCandles.get(token.id);
  const now     = Math.floor(Date.now() / 1000);
  const closeAt = live.time + token.candle_interval;

  if (now < closeAt) return null; // still forming

  // Snapshot the accumulated live candle and save to DB
  const candle = {
    time:   live.time,
    open:   Number(live.open.toFixed(8)),
    high:   Number(live.high.toFixed(8)),
    low:    Number(live.low.toFixed(8)),
    close:  Number(live.close.toFixed(8)),
    volume: Number(live.volume.toFixed(2)),
  };

  db.prepare(
    'INSERT OR IGNORE INTO candlesticks (token_id, time, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(token.id, candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume);

  const prev24h   = db.prepare('SELECT close FROM candlesticks WHERE token_id = ? ORDER BY time ASC LIMIT 1').get(token.id);
  const change24h = prev24h ? ((candle.close - prev24h.close) / prev24h.close) * 100 : 0;
  const vol24h    = db.prepare('SELECT SUM(volume) as v FROM candlesticks WHERE token_id = ? AND time > ?')
                      .get(token.id, now - 86400)?.v || 0;

  db.prepare('UPDATE tokens SET price = ?, change_24h = ?, volume_24h = ?, market_cap = ? WHERE id = ?').run(
    candle.close, change24h, vol24h,
    candle.close * (token.total_supply || 1000000000), token.id,
  );

  // Start the next forming candle immediately
  initLiveCandle(token.id, candle.close, closeAt);

  if (global._checkTpOrders) global._checkTpOrders(token.id, candle.close);

  return candle;
}

// ─── Start ────────────────────────────────────────────────────────────────────

function startChartSimulator(io) {
  _io = io;

  // Bootstrap live candles from DB on startup
  const tokens = db.prepare('SELECT * FROM tokens WHERE active = 1').all();
  for (const token of tokens) {
    const lastRow = db.prepare('SELECT * FROM candlesticks WHERE token_id = ? ORDER BY time DESC LIMIT 1').get(token.id);
    if (lastRow) initLiveCandle(token.id, lastRow.close, lastRow.time + token.candle_interval);
  }

  // Every 10 s: close candles whose interval has ended
  setInterval(() => {
    const activeTokens = db.prepare('SELECT * FROM tokens WHERE active = 1').all();
    for (const token of activeTokens) {
      const candle = buildNextCandle(token);
      if (candle) {
        io.to(`token:${token.id}`).emit('new-candle', { tokenId: token.id, candle });
        io.to(`token:${token.id}`).emit('price-update', { tokenId: token.id, price: candle.close });
      }
    }
  }, 10000);

  // Every 2 s: GBM micro-tick so forming candles move between transactions
  setInterval(() => {
    const activeTokens = db.prepare('SELECT * FROM tokens WHERE active = 1').all();
    for (const token of activeTokens) tickLiveCandle(token);
  }, 2000);
}

module.exports = { seedCandlesForToken, startChartSimulator, generateHistoricalCandles, updateLiveCandle };
