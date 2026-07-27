const db = require('../db/database');

const TON_PRICE_USD = 5.2;

function executeOrder(order, currentPrice, io) {
  const proceeds_usd = order.amount * currentPrice;
  const cost_usd = order.amount * (order.avg_buy_price || 0);
  const pnl_usd = proceeds_usd - cost_usd;
  const pnl_ton = pnl_usd / TON_PRICE_USD;
  const proceeds_ton = proceeds_usd / TON_PRICE_USD;
  const now = Math.floor(Date.now() / 1000);

  // Mark order as executed
  db.prepare(`
    UPDATE tp_orders SET
      status = 'executed',
      executed_at = ?,
      executed_price = ?,
      pnl_usd = ?,
      pnl_ton = ?
    WHERE id = ?
  `).run(now, currentPrice, pnl_usd, pnl_ton, order.id);

  // Deduct tokens from portfolio
  db.prepare('UPDATE portfolios SET balance = balance - ? WHERE wallet = ? AND token_id = ?')
    .run(order.amount, order.wallet, order.token_id);

  // Credit TON to wallet balance
  db.prepare(`
    INSERT INTO ton_balances (wallet, balance_ton, total_realized_pnl_usd)
    VALUES (?, ?, ?)
    ON CONFLICT(wallet) DO UPDATE SET
      balance_ton = balance_ton + excluded.balance_ton,
      total_realized_pnl_usd = total_realized_pnl_usd + excluded.total_realized_pnl_usd
  `).run(order.wallet, proceeds_ton, pnl_usd);

  // Record sell transaction
  db.prepare(
    'INSERT INTO transactions (token_id, type, amount, price, total, wallet) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(order.token_id, 'sell', order.amount, currentPrice, proceeds_usd, order.wallet);

  const token = db.prepare('SELECT symbol FROM tokens WHERE id = ?').get(order.token_id);

  const payload = {
    orderId: order.id,
    wallet: order.wallet,
    token_id: order.token_id,
    symbol: token?.symbol,
    amount: order.amount,
    executed_price: currentPrice,
    proceeds_usd,
    proceeds_ton: Number(proceeds_ton.toFixed(4)),
    pnl_usd: Number(pnl_usd.toFixed(4)),
    pnl_ton: Number(pnl_ton.toFixed(4)),
  };

  // Emit to token room so chart removes the price line
  io.to(`token:${order.token_id}`).emit('tp-order-executed', payload);
  // Emit to wallet-specific room for notifications
  io.to(`wallet:${order.wallet}`).emit('tp-executed', payload);

  console.log(`[TP] Executed order #${order.id} — ${order.amount} ${token?.symbol} @ $${currentPrice} → +${proceeds_ton.toFixed(4)} TON (PnL: ${pnl_usd >= 0 ? '+' : ''}$${pnl_usd.toFixed(2)})`);
}

function checkOrdersForToken(tokenId, currentPrice, io) {
  const openOrders = db.prepare(
    "SELECT * FROM tp_orders WHERE token_id = ? AND status = 'open' AND target_price <= ?"
  ).all(tokenId, currentPrice);

  for (const order of openOrders) {
    try {
      executeOrder(order, currentPrice, io);
    } catch (err) {
      console.error(`[TP] Error executing order #${order.id}:`, err.message);
    }
  }
}

function startOrderWatcher(io) {
  // Hook into price updates — called from chartSimulator and txSimulator
  global._checkTpOrders = (tokenId, price) => checkOrdersForToken(tokenId, price, io);
  console.log('[OrderWatcher] TP order watcher started');
}

module.exports = { startOrderWatcher, checkOrdersForToken };
