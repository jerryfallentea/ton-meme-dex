require('dotenv').config();
const db = require('./database');
const { seedCandlesForToken } = require('../services/chartSimulator');

const tokens = [
  {
    name: 'GramPepe',
    symbol: 'GPEPE',
    image: 'https://i.imgur.com/6hNzRXA.png',
    description: 'The original meme frog conquered Ethereum. Now he conquers TON.',
    price: 0.00000842,
    initial_price: 0.000003,
    market_cap: 8420000,
    holders: 3241,
    volatility: 0.035,
    trend_strength: 1.4,
    pump_chance: 0.08,
    tx_speed: 1800,
    candle_interval: 60,
  },
  {
    name: 'TON Doge',
    symbol: 'TDOGE',
    image: 'https://i.imgur.com/9RQWQ3e.png',
    description: 'Much TON. Very fast. Such meme. Wow.',
    price: 0.00124,
    initial_price: 0.0005,
    market_cap: 12400000,
    holders: 7832,
    volatility: 0.022,
    trend_strength: 1.1,
    pump_chance: 0.04,
    tx_speed: 4000,
    candle_interval: 60,
  },
  {
    name: 'GramCat',
    symbol: 'GCAT',
    image: 'https://i.imgur.com/sTqLuqA.png',
    description: 'The internet runs on cats. TON runs on GramCat.',
    price: 0.00000021,
    initial_price: 0.0000001,
    market_cap: 2100000,
    holders: 1547,
    volatility: 0.05,
    trend_strength: 1.8,
    pump_chance: 0.12,
    tx_speed: 1200,
    candle_interval: 60,
  },
  {
    name: 'TonkWojak',
    symbol: 'WOJAK',
    image: 'https://i.imgur.com/kq7Aqy1.png',
    description: 'We are all gonna make it. On TON.',
    price: 0.0000551,
    initial_price: 0.00002,
    market_cap: 5510000,
    holders: 2894,
    volatility: 0.028,
    trend_strength: 1.25,
    pump_chance: 0.06,
    tx_speed: 2500,
    candle_interval: 60,
  },
  {
    name: 'GramShib',
    symbol: 'GSHIB',
    image: 'https://i.imgur.com/7fPzMzT.png',
    description: 'The Shib killer lands on TON. 1 quadrillion supply, 0 regrets.',
    price: 0.000000091,
    initial_price: 0.00000005,
    market_cap: 910000,
    holders: 892,
    volatility: 0.045,
    trend_strength: 1.6,
    pump_chance: 0.1,
    tx_speed: 900,
    candle_interval: 60,
  },
];

// SAFE SEED: only inserts tokens that don't exist yet — never deletes anything
const existing = db.prepare('SELECT COUNT(*) as c FROM tokens').get().c;

if (existing > 0) {
  console.log(`Database already has ${existing} tokens — skipping seed to protect your data.`);
  console.log('To force a full reseed, run:  node src/db/seed.js --force');
  if (!process.argv.includes('--force')) process.exit(0);
  // --force: wipe and reseed
  console.log('\nForce flag detected — wiping and reseeding...');
  db.prepare('DELETE FROM tokens').run();
  db.prepare('DELETE FROM candlesticks').run();
  db.prepare('DELETE FROM transactions').run();
}

const insert = db.prepare(`
  INSERT INTO tokens (name, symbol, image, description, price, initial_price, market_cap, holders, volatility, trend_strength, pump_chance, tx_speed, candle_interval)
  VALUES (@name, @symbol, @image, @description, @price, @initial_price, @market_cap, @holders, @volatility, @trend_strength, @pump_chance, @tx_speed, @candle_interval)
`);

for (const token of tokens) {
  const result = insert.run(token);
  const created = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
  seedCandlesForToken(created);
  console.log(`Seeded: ${created.name} (${created.symbol}) — price: ${created.price}`);
}

console.log('\n✓ Database seeded with', tokens.length, 'tokens');
process.exit(0);
