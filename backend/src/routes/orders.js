const express = require('express');
const db = require('../db/database');

const router = express.Router();
const TON_PRICE_USD = 5.2;

// Get all open TP orders for a wallet
router.get('/wallet/:wallet', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, t.name, t.symbol, t.price as current_price, t.image
    FROM tp_orders o
    JOIN tokens t ON t.id = o.token_id
    WHERE o.wallet = ? ORDER BY o.created_at DESC
  `).all(req.params.wallet);
  res.json(orders);
});

// Get open TP orders for a specific token+wallet
router.get('/token/:tokenId/:wallet', (req, res) => {
  const orders = db.prepare(
    "SELECT * FROM tp_orders WHERE token_id = ? AND wallet = ? AND status = 'open' ORDER BY target_price DESC"
  ).all(req.params.tokenId, req.params.wallet);
  res.json(orders);
});

// Create TP order
router.post('/', (req, res) => {
  const { wallet, token_id, target_price, amount, percentage } = req.body;

  if (!wallet || !token_id || !target_price || !amount) {
    return res.status(400).json({ error: 'wallet, token_id, target_price, amount are required' });
  }

  const token = db.prepare('SELECT * FROM tokens WHERE id = ? AND active = 1').get(token_id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  if (target_price <= token.price) {
    return res.status(400).json({ error: 'Target price must be above current price for a take-profit order' });
  }

  const portfolio = db.prepare('SELECT * FROM portfolios WHERE wallet = ? AND token_id = ?').get(wallet, token_id);
  if (!portfolio || portfolio.balance < amount) {
    return res.status(400).json({ error: `Insufficient balance. You hold ${portfolio?.balance || 0} ${token.symbol}` });
  }

  // Check total amount reserved in open orders
  const reserved = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as r FROM tp_orders WHERE wallet = ? AND token_id = ? AND status = 'open'"
  ).get(wallet, token_id).r;

  if (reserved + amount > portfolio.balance) {
    return res.status(400).json({ error: `Amount exceeds available balance after existing orders (${(portfolio.balance - reserved).toFixed(4)} available)` });
  }

  const result = db.prepare(`
    INSERT INTO tp_orders (wallet, token_id, target_price, amount, percentage, avg_buy_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(wallet, token_id, target_price, amount, percentage || null, portfolio.avg_buy_price || 0);

  const order = db.prepare('SELECT * FROM tp_orders WHERE id = ?').get(result.lastInsertRowid);
  req.app.get('io').to(`token:${token_id}`).emit('tp-order-created', { wallet, order });
  res.status(201).json(order);
});

// Edit TP order
router.put('/:id', (req, res) => {
  const { wallet, target_price, amount, percentage } = req.body;
  const order = db.prepare("SELECT * FROM tp_orders WHERE id = ? AND status = 'open'").get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found or already executed' });
  if (order.wallet !== wallet) return res.status(403).json({ error: 'Not your order' });

  const token = db.prepare('SELECT price FROM tokens WHERE id = ?').get(order.token_id);
  if (target_price && target_price <= token.price) {
    return res.status(400).json({ error: 'Target price must be above current price' });
  }

  db.prepare(`
    UPDATE tp_orders SET target_price = COALESCE(?, target_price),
    amount = COALESCE(?, amount), percentage = COALESCE(?, percentage)
    WHERE id = ?
  `).run(target_price ?? null, amount ?? null, percentage ?? null, req.params.id);

  const updated = db.prepare('SELECT * FROM tp_orders WHERE id = ?').get(req.params.id);
  req.app.get('io').to(`token:${order.token_id}`).emit('tp-order-updated', { wallet, order: updated });
  res.json(updated);
});

// Cancel TP order
router.delete('/:id', (req, res) => {
  const { wallet } = req.body;
  const order = db.prepare("SELECT * FROM tp_orders WHERE id = ? AND status = 'open'").get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.wallet !== wallet) return res.status(403).json({ error: 'Not your order' });

  db.prepare("UPDATE tp_orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  req.app.get('io').to(`token:${order.token_id}`).emit('tp-order-cancelled', { wallet, orderId: order.id });
  res.json({ success: true });
});

// Get TON balance for wallet
router.get('/balance/:wallet', (req, res) => {
  const row = db.prepare('SELECT * FROM ton_balances WHERE wallet = ?').get(req.params.wallet);
  res.json(row || { wallet: req.params.wallet, balance_ton: 0, total_realized_pnl_usd: 0 });
});

// Get full portfolio (holdings + open orders + balance)
router.get('/portfolio/:wallet', (req, res) => {
  const holdings = db.prepare(`
    SELECT p.*, t.name, t.symbol, t.price as current_price, t.image, t.market_cap
    FROM portfolios p
    JOIN tokens t ON t.id = p.token_id
    WHERE p.wallet = ? AND p.balance > 0
  `).all(req.params.wallet);

  const openOrders = db.prepare(`
    SELECT o.*, t.name, t.symbol, t.price as current_price
    FROM tp_orders o JOIN tokens t ON t.id = o.token_id
    WHERE o.wallet = ? AND o.status = 'open'
    ORDER BY o.created_at DESC
  `).all(req.params.wallet);

  const history = db.prepare(`
    SELECT o.*, t.name, t.symbol
    FROM tp_orders o JOIN tokens t ON t.id = o.token_id
    WHERE o.wallet = ? AND o.status = 'executed'
    ORDER BY o.executed_at DESC LIMIT 20
  `).all(req.params.wallet);

  const balance = db.prepare('SELECT * FROM ton_balances WHERE wallet = ?').get(req.params.wallet);

  res.json({
    holdings,
    openOrders,
    history,
    balance: balance || { balance_ton: 0, total_realized_pnl_usd: 0 },
  });
});

module.exports = router;
