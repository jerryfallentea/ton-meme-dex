const express = require('express');
const db = require('../db/database');
const { seedCandlesForToken } = require('../services/chartSimulator');
const { addTokenToSimulator } = require('../services/txSimulator');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.body?.adminKey;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

router.get('/tokens', (req, res) => {
  const tokens = db.prepare('SELECT * FROM tokens ORDER BY created_at DESC').all();
  res.json(tokens);
});

router.post('/tokens', (req, res) => {
  const {
    name, symbol, image, description,
    price, market_cap,
    volatility = 0.02,
    trend_strength = 1.0,
    pump_chance = 0.05,
    tx_speed = 3000,
    candle_interval = 60,
  } = req.body;

  if (!name || !symbol || !price) {
    return res.status(400).json({ error: 'name, symbol, and price are required' });
  }

  const mc = market_cap || price * 1000000000;
  const total_supply = Math.round(mc / price);
  const result = db.prepare(`
    INSERT INTO tokens (name, symbol, image, description, price, initial_price, total_supply, market_cap,
                        volatility, trend_strength, pump_chance, tx_speed, candle_interval)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, symbol.toUpperCase(), image || '', description || '',
    price, price, total_supply, mc,
    volatility, trend_strength, pump_chance, tx_speed, candle_interval
  );

  const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
  seedCandlesForToken(token);
  addTokenToSimulator(token, req.app.get('io'));

  res.status(201).json(token);
});

router.put('/tokens/:id', (req, res) => {
  const {
    name, symbol, image, description,
    price, market_cap,
    volatility, trend_strength, pump_chance, tx_speed, candle_interval,
    active,
  } = req.body;

  const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  db.prepare(`
    UPDATE tokens SET
      name = COALESCE(?, name),
      symbol = COALESCE(?, symbol),
      image = COALESCE(?, image),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      market_cap = COALESCE(?, market_cap),
      volatility = COALESCE(?, volatility),
      trend_strength = COALESCE(?, trend_strength),
      pump_chance = COALESCE(?, pump_chance),
      tx_speed = COALESCE(?, tx_speed),
      candle_interval = COALESCE(?, candle_interval),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(
    name ?? null, symbol ? symbol.toUpperCase() : null, image ?? null, description ?? null,
    price ?? null, market_cap ?? null,
    volatility ?? null, trend_strength ?? null, pump_chance ?? null,
    tx_speed ?? null, candle_interval ?? null,
    active !== undefined ? (active ? 1 : 0) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/tokens/:id', (req, res) => {
  db.prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/tokens/:id/permanent', (req, res) => {
  db.prepare('DELETE FROM tokens WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/tokens/:id/reset-candles', (req, res) => {
  const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  db.prepare('DELETE FROM candlesticks WHERE token_id = ?').run(token.id);
  db.prepare('UPDATE tokens SET price = initial_price WHERE id = ?').run(token.id);
  const fresh = db.prepare('SELECT * FROM tokens WHERE id = ?').get(token.id);
  seedCandlesForToken(fresh);

  res.json({ success: true });
});

// Set manual trend direction for a token
router.post('/tokens/:id/set-trend', (req, res) => {
  const { mode } = req.body;
  if (!['auto', 'bullish', 'bearish'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be auto, bullish, or bearish' });
  }
  const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  // Record current price as the peak when switching to bearish
  const peak = mode === 'bearish' ? token.price : null;
  db.prepare('UPDATE tokens SET trend_mode = ?, trend_peak_price = ? WHERE id = ?')
    .run(mode, peak, req.params.id);

  res.json({ success: true, mode, peak });
});

router.get('/stats', (req, res) => {
  const totalTokens = db.prepare('SELECT COUNT(*) as c FROM tokens WHERE active = 1').get().c;
  const totalTxns = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
  const totalVolume = db.prepare('SELECT SUM(total) as v FROM transactions').get().v || 0;
  const uniqueWallets = db.prepare('SELECT COUNT(DISTINCT wallet) as c FROM portfolios').get().c;
  res.json({ totalTokens, totalTxns, totalVolume, uniqueWallets });
});

module.exports = router;
