const db = require('../db/database');

function generateCandle(prevClose, personality, time) {
  const { volatility, trend_strength, pump_chance } = personality;

  const drift = 0.00025 * trend_strength;
  const noise = (Math.random() - 0.47) * volatility;
  const pump = Math.random() < pump_chance ? Math.random() * 0.04 : 0;
  const dip = Math.random() < 0.03 ? -(Math.random() * 0.02) : 0;

  const changePercent = drift + noise + pump + dip;
  const open = prevClose;
  const close = Math.max(open * (1 + changePercent), 0.000001);

  const bodyRange = Math.abs(close - open);
  const wickMult = 0.3 + Math.random() * 0.7;
  const high = Math.max(open, close) + bodyRange * wickMult * Math.random();
  const low = Math.min(open, close) - bodyRange * (0.2 + Math.random() * 0.4) * Math.random();

  const baseVol = prevClose * 50000;
  const volume = baseVol * (0.5 + Math.random() * 1.5) * (1 + pump * 8);

  return { time, open, high, low, close: Number(close.toFixed(8)), volume: Number(volume.toFixed(2)) };
}

function generateHistoricalCandles(token, count) {
  const personality = {
    volatility: token.volatility,
    trend_strength: token.trend_strength,
    pump_chance: token.pump_chance,
  };

  const now = Math.floor(Date.now() / 1000);
  const interval = token.candle_interval;
  const startTime = now - count * interval;

  const candles = [];
  let price = token.initial_price;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * interval;
    const candle = generateCandle(price, personality, time);
    candles.push(candle);
    price = candle.close;
  }

  return candles;
}

function seedCandlesForToken(token) {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM candlesticks WHERE token_id = ?').get(token.id);
  if (existing.cnt > 0) return;

  const candles = generateHistoricalCandles(token, 300);
  const lastCandle = candles[candles.length - 1];

  const insert = db.prepare(
    'INSERT OR IGNORE INTO candlesticks (token_id, time, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((rows) => {
    for (const c of rows) insert.run(token.id, c.time, c.open, c.high, c.low, c.close, c.volume);
  });
  insertMany(candles);

  const change24h = ((lastCandle.close - candles[Math.max(0, candles.length - 1440)].open) / candles[0].open) * 100;
  db.prepare('UPDATE tokens SET price = ?, change_24h = ? WHERE id = ?').run(lastCandle.close, change24h, token.id);
}

function buildNextCandle(token) {
  const lastRow = db.prepare('SELECT * FROM candlesticks WHERE token_id = ? ORDER BY time DESC LIMIT 1').get(token.id);
  if (!lastRow) return null;

  const interval = token.candle_interval;
  const now = Math.floor(Date.now() / 1000);
  const nextTime = lastRow.time + interval;

  if (nextTime > now) return null;

  const personality = {
    volatility: token.volatility,
    trend_strength: token.trend_strength,
    pump_chance: token.pump_chance,
  };

  const candle = generateCandle(lastRow.close, personality, nextTime);

  db.prepare(
    'INSERT OR IGNORE INTO candlesticks (token_id, time, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(token.id, candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume);

  const prev24h = db.prepare('SELECT close FROM candlesticks WHERE token_id = ? ORDER BY time ASC LIMIT 1').get(token.id);
  const change24h = prev24h ? ((candle.close - prev24h.close) / prev24h.close) * 100 : 0;
  const vol24h = db.prepare(
    'SELECT SUM(volume) as v FROM candlesticks WHERE token_id = ? AND time > ?'
  ).get(token.id, now - 86400)?.v || 0;

  db.prepare('UPDATE tokens SET price = ?, change_24h = ?, volume_24h = ?, market_cap = ? WHERE id = ?').run(
    candle.close,
    change24h,
    vol24h,
    candle.close * (token.total_supply || 1000000000),
    token.id
  );

  return candle;
}

function startChartSimulator(io) {
  setInterval(() => {
    const tokens = db.prepare('SELECT * FROM tokens WHERE active = 1').all();
    for (const token of tokens) {
      const candle = buildNextCandle(token);
      if (candle) {
        io.to(`token:${token.id}`).emit('new-candle', { tokenId: token.id, candle });
        io.to(`token:${token.id}`).emit('price-update', { tokenId: token.id, price: candle.close });
      }
    }
  }, 10000);
}

module.exports = { seedCandlesForToken, startChartSimulator, generateHistoricalCandles };
