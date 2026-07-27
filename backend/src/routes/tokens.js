const express = require('express');
const db = require('../db/database');
const { getLiveCandle } = require('../services/chartSimulator');

const router = express.Router();
const TON_PRICE_USD = 5.2;

router.get('/', (req, res) => {
  const tokens = db.prepare(`
    SELECT id, name, symbol, image, description, price, initial_price, market_cap,
           volume_24h, change_24h, holders, volatility, trend_strength, pump_chance,
           tx_speed, created_at
    FROM tokens WHERE active = 1 ORDER BY market_cap DESC
  `).all();
  res.json(tokens);
});

router.get('/:id', (req, res) => {
  const token = db.prepare('SELECT * FROM tokens WHERE id = ? AND active = 1').get(req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });
  res.json(token);
});

router.get('/:id/candles', (req, res) => {
  const { limit = 300, from } = req.query;
  let query = 'SELECT time, open, high, low, close, volume FROM candlesticks WHERE token_id = ?';
  const params = [req.params.id];

  if (from) {
    query += ' AND time >= ?';
    params.push(Number(from));
  }

  query += ' ORDER BY time ASC LIMIT ?';
  params.push(Number(limit));

  const candles = db.prepare(query).all(...params);

  // Append the live forming candle so the chart has no gap on initial load
  const live = getLiveCandle(Number(req.params.id));
  if (live && (!candles.length || live.time > candles[candles.length - 1].time)) {
    candles.push(live);
  }

  res.json(candles);
});

router.get('/:id/transactions', (req, res) => {
  const { limit = 50 } = req.query;
  const txns = db.prepare(
    'SELECT * FROM transactions WHERE token_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(req.params.id, Number(limit));
  res.json(txns);
});

router.get('/:id/portfolio/:wallet', (req, res) => {
  const row = db.prepare(
    'SELECT * FROM portfolios WHERE wallet = ? AND token_id = ?'
  ).get(req.params.wallet, req.params.id);
  res.json(row || { balance: 0, avg_buy_price: null });
});

router.post('/:id/trade', (req, res) => {
  const { wallet, type, amount } = req.body;

  if (!wallet || !type || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid trade parameters' });
  }
  if (!['buy', 'sell'].includes(type)) {
    return res.status(400).json({ error: 'Type must be buy or sell' });
  }

  const token = db.prepare('SELECT * FROM tokens WHERE id = ? AND active = 1').get(req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  const price = token.price;
  const total = Number((amount * price).toFixed(6));

  // Fetch portfolio for both buy and sell
  const portfolio = db.prepare(
    'SELECT * FROM portfolios WHERE wallet = ? AND token_id = ?'
  ).get(wallet, token.id);

  if (type === 'sell') {
    if (!portfolio || portfolio.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
  }

  // ── Execute trade ──────────────────────────────────────────────────────────

  if (type === 'buy') {
    // Give new wallets a simulation starter balance of 1000 TON
    db.prepare(`
      INSERT OR IGNORE INTO ton_balances (wallet, balance_ton, total_realized_pnl_usd)
      VALUES (?, 1000, 0)
    `).run(wallet);

    // Deduct cost (won't go below 0 in simulation)
    const costTon = total / TON_PRICE_USD;
    db.prepare('UPDATE ton_balances SET balance_ton = MAX(0, balance_ton - ?) WHERE wallet = ?')
      .run(costTon, wallet);

    // Update portfolio
    if (portfolio) {
      const newBalance = portfolio.balance + amount;
      const newAvg = ((portfolio.avg_buy_price || price) * portfolio.balance + price * amount) / newBalance;
      db.prepare('UPDATE portfolios SET balance = ?, avg_buy_price = ? WHERE wallet = ? AND token_id = ?')
        .run(newBalance, newAvg, wallet, token.id);
    } else {
      db.prepare('INSERT INTO portfolios (wallet, token_id, balance, avg_buy_price) VALUES (?, ?, ?, ?)')
        .run(wallet, token.id, amount, price);
    }

    db.prepare('UPDATE tokens SET holders = holders + 1 WHERE id = ?').run(token.id);

    // Record transaction
    db.prepare(
      'INSERT INTO transactions (token_id, type, amount, price, total, wallet, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(token.id, 'buy', amount, price, total, wallet, 'manual');

  } else {
    // SELL — capture avg_buy_price now (before deducting balance)
    const avgBuyPrice = portfolio.avg_buy_price || 0;
    const pnlUsd     = Number(((price - avgBuyPrice) * amount).toFixed(6));
    const proceedsTon = Number((total / TON_PRICE_USD).toFixed(8));

    // Deduct from portfolio
    db.prepare('UPDATE portfolios SET balance = balance - ? WHERE wallet = ? AND token_id = ?')
      .run(amount, wallet, token.id);

    // Credit proceeds + realized PnL to ton_balances
    db.prepare(`
      INSERT INTO ton_balances (wallet, balance_ton, total_realized_pnl_usd)
      VALUES (?, ?, ?)
      ON CONFLICT(wallet) DO UPDATE SET
        balance_ton            = balance_ton            + excluded.balance_ton,
        total_realized_pnl_usd = total_realized_pnl_usd + excluded.total_realized_pnl_usd
    `).run(wallet, proceedsTon, pnlUsd);

    // Record transaction with avg_buy_price for PnL history
    db.prepare(
      'INSERT INTO transactions (token_id, type, amount, price, total, wallet, avg_buy_price, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(token.id, 'sell', amount, price, total, wallet, avgBuyPrice, 'manual');
  }

  const tx = {
    id: db.prepare('SELECT last_insert_rowid() as id').get().id,
    token_id: token.id,
    type,
    amount,
    price,
    total,
    wallet,
    timestamp: Math.floor(Date.now() / 1000),
  };

  req.app.get('io').to(`token:${token.id}`).emit('new-transaction', tx);

  res.json({ success: true, transaction: tx });
});

module.exports = router;
