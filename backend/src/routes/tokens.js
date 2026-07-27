const express = require('express');
const db = require('../db/database');

const router = express.Router();

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

  if (type === 'sell') {
    const portfolio = db.prepare(
      'SELECT balance FROM portfolios WHERE wallet = ? AND token_id = ?'
    ).get(wallet, token.id);
    if (!portfolio || portfolio.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
  }

  const txResult = db.prepare(
    'INSERT INTO transactions (token_id, type, amount, price, total, wallet) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(token.id, type, amount, price, total, wallet);

  if (type === 'buy') {
    const existing = db.prepare('SELECT * FROM portfolios WHERE wallet = ? AND token_id = ?').get(wallet, token.id);
    if (existing) {
      const newBalance = existing.balance + amount;
      const newAvg = ((existing.avg_buy_price || price) * existing.balance + price * amount) / newBalance;
      db.prepare('UPDATE portfolios SET balance = ?, avg_buy_price = ? WHERE wallet = ? AND token_id = ?')
        .run(newBalance, newAvg, wallet, token.id);
    } else {
      db.prepare('INSERT INTO portfolios (wallet, token_id, balance, avg_buy_price) VALUES (?, ?, ?, ?)')
        .run(wallet, token.id, amount, price);
    }
    db.prepare('UPDATE tokens SET holders = holders + 1 WHERE id = ?').run(token.id);
  } else {
    db.prepare('UPDATE portfolios SET balance = balance - ? WHERE wallet = ? AND token_id = ?')
      .run(amount, wallet, token.id);
  }

  const tx = {
    id: txResult.lastInsertRowid,
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
