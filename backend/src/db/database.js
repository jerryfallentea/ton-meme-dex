const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    image TEXT,
    description TEXT,
    price REAL NOT NULL,
    initial_price REAL NOT NULL,
    total_supply REAL NOT NULL DEFAULT 1000000000,
    market_cap REAL NOT NULL DEFAULT 0,
    volume_24h REAL NOT NULL DEFAULT 0,
    change_24h REAL NOT NULL DEFAULT 0,
    holders INTEGER NOT NULL DEFAULT 0,
    volatility REAL NOT NULL DEFAULT 0.02,
    trend_strength REAL NOT NULL DEFAULT 1.0,
    pump_chance REAL NOT NULL DEFAULT 0.05,
    tx_speed INTEGER NOT NULL DEFAULT 3000,
    candle_interval INTEGER NOT NULL DEFAULT 900,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS candlesticks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    time INTEGER NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    UNIQUE(token_id, time)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('buy','sell')),
    amount REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    wallet TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    avg_buy_price REAL,
    UNIQUE(wallet, token_id),
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tp_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    target_price REAL NOT NULL,
    amount REAL NOT NULL,
    percentage REAL,
    avg_buy_price REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    executed_at INTEGER,
    executed_price REAL,
    pnl_usd REAL,
    pnl_ton REAL,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ton_balances (
    wallet TEXT PRIMARY KEY,
    balance_ton REAL NOT NULL DEFAULT 0,
    total_realized_pnl_usd REAL NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_candles_token_time ON candlesticks(token_id, time);
  CREATE INDEX IF NOT EXISTS idx_txns_token ON transactions(token_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_portfolio_wallet ON portfolios(wallet);
  CREATE INDEX IF NOT EXISTS idx_tp_orders_wallet ON tp_orders(wallet, status);
  CREATE INDEX IF NOT EXISTS idx_tp_orders_token ON tp_orders(token_id, status);
`);

// Safe migrations for existing databases
try { db.exec('ALTER TABLE transactions ADD COLUMN avg_buy_price REAL'); } catch {}
try { db.exec("ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'"); } catch {}
try { db.exec("ALTER TABLE tokens ADD COLUMN trend_mode TEXT NOT NULL DEFAULT 'auto'"); } catch {}
try { db.exec('ALTER TABLE tokens ADD COLUMN trend_peak_price REAL'); } catch {}

module.exports = db;
