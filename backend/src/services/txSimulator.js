const db = require('../db/database');

const PREFIXES = ['EQ', 'UQ'];
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz0123456789';

function randomWallet() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  let addr = prefix;
  for (let i = 0; i < 46; i++) addr += CHARS[Math.floor(Math.random() * CHARS.length)];
  return addr;
}

function randomAmount(price, type) {
  const usdValue = type === 'buy'
    ? 10 + Math.random() * 490
    : 5 + Math.random() * 200;
  return Number((usdValue / price).toFixed(2));
}

function simulateTx(token, io) {
  const currentToken = db.prepare('SELECT price FROM tokens WHERE id = ?').get(token.id);
  if (!currentToken) return;

  const price = currentToken.price;
  const isBuy = Math.random() < 0.68;
  const type = isBuy ? 'buy' : 'sell';
  const amount = randomAmount(price, type);
  const total = Number((amount * price).toFixed(6));
  const wallet = randomWallet();

  const result = db.prepare(
    'INSERT INTO transactions (token_id, type, amount, price, total, wallet) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(token.id, type, amount, price, total, wallet);

  const tx = {
    id: result.lastInsertRowid,
    token_id: token.id,
    type,
    amount,
    price,
    total,
    wallet,
    timestamp: Math.floor(Date.now() / 1000),
  };

  io.to(`token:${token.id}`).emit('new-transaction', tx);

  // Tiny price nudge — up to 0.03% per tx, net bullish (main trend comes from chart simulator)
  const nudge = Math.random() * 0.0003;
  const priceImpact = isBuy ? 1 + nudge : 1 - nudge * 0.5;
  db.prepare('UPDATE tokens SET price = ? WHERE id = ?').run(
    Number((price * priceImpact).toFixed(12)),
    token.id
  );
}

const tokenTimers = new Map();

function startTxSimulator(io) {
  function scheduleToken(token) {
    const jitter = token.tx_speed * (0.5 + Math.random());
    const timer = setTimeout(() => {
      simulateTx(token, io);
      const refreshed = db.prepare('SELECT * FROM tokens WHERE id = ? AND active = 1').get(token.id);
      if (refreshed) scheduleToken(refreshed);
      else tokenTimers.delete(token.id);
    }, jitter);
    tokenTimers.set(token.id, timer);
  }

  const tokens = db.prepare('SELECT * FROM tokens WHERE active = 1').all();
  for (const token of tokens) scheduleToken(token);

  setInterval(() => {
    const active = db.prepare('SELECT * FROM tokens WHERE active = 1').all();
    for (const token of active) {
      if (!tokenTimers.has(token.id)) scheduleToken(token);
    }
  }, 15000);
}

function addTokenToSimulator(token, io) {
  if (!tokenTimers.has(token.id)) {
    const jitter = token.tx_speed * (0.5 + Math.random());
    const timer = setTimeout(function tick() {
      simulateTx(token, io);
      const refreshed = db.prepare('SELECT * FROM tokens WHERE id = ? AND active = 1').get(token.id);
      if (refreshed) {
        const next = setTimeout(tick, refreshed.tx_speed * (0.5 + Math.random()));
        tokenTimers.set(token.id, next);
      } else {
        tokenTimers.delete(token.id);
      }
    }, jitter);
    tokenTimers.set(token.id, timer);
  }
}

module.exports = { startTxSimulator, addTokenToSimulator };
