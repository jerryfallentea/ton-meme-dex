const TelegramBot = require('node-telegram-bot-api');
const db = require('../db/database');
const { seedCandlesForToken } = require('../services/chartSimulator');
const { addTokenToSimulator } = require('../services/txSimulator');

const sessions = new Map();

function isAdmin(msgOrQuery) {
  const adminId = parseInt(process.env.ADMIN_TELEGRAM_ID);
  return adminId && (msgOrQuery.from?.id === adminId);
}

function formatPrice(p) {
  if (!p) return '—';
  if (p < 0.000001) return p.toExponential(3);
  if (p < 0.001) return p.toFixed(8);
  return p.toFixed(6);
}

function fmtMC(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${Number(v).toFixed(0)}`;
}

function trendLabel(mode) {
  if (mode === 'bullish') return '↑ Bullish';
  if (mode === 'bearish') return '↓ Bearish';
  return '↔ Auto';
}

function adminMenu(chatId, bot) {
  const stats = {
    tokens:  db.prepare('SELECT COUNT(*) as c FROM tokens WHERE active=1').get().c,
    txns:    db.prepare('SELECT COUNT(*) as c FROM transactions').get().c,
    wallets: db.prepare('SELECT COUNT(DISTINCT wallet) as c FROM portfolios').get().c,
  };
  bot.sendMessage(chatId,
    `*Admin Panel*\n\nTokens: ${stats.tokens} active\nTransactions: ${stats.txns}\nUnique wallets: ${stats.wallets}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'List Tokens',  callback_data: 'admin_list'  }],
          [{ text: 'Add Token',    callback_data: 'admin_add'   }],
          [{ text: 'Full Stats',   callback_data: 'admin_stats' }],
        ],
      },
    }
  );
}

function listTokens(chatId, bot) {
  const tokens = db.prepare('SELECT * FROM tokens ORDER BY market_cap DESC').all();
  if (!tokens.length) return bot.sendMessage(chatId, 'No tokens yet.');

  for (const t of tokens) {
    const status    = t.active ? 'Active' : 'Inactive';
    const mode      = t.trend_mode || 'auto';
    const modeText  = trendLabel(mode);
    const peakInfo  = mode === 'bearish' && t.trend_peak_price
      ? `\nCap: $${formatPrice(t.trend_peak_price)}`
      : '';

    // Mark active trend mode with a dot
    const bull = mode === 'bullish' ? '• Bullish' : 'Bullish';
    const auto = mode === 'auto'    ? '• Auto'    : 'Auto';
    const bear = mode === 'bearish' ? '• Bearish' : 'Bearish';

    bot.sendMessage(chatId,
      `*${t.name}* (${t.symbol})\n` +
      `Price: $${formatPrice(t.price)}\n` +
      `24h: ${Number(t.change_24h).toFixed(2)}%  |  MC: ${fmtMC(t.market_cap)}\n` +
      `Trend mode: ${modeText}${peakInfo}\n` +
      `Status: ${status}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t.active ? 'Disable' : 'Enable', callback_data: `toggle_${t.id}` },
              { text: 'Reset Chart',                    callback_data: `reset_${t.id}`  },
              { text: 'Delete',                         callback_data: `delete_${t.id}` },
            ],
            [
              { text: bull, callback_data: `trend_bullish_${t.id}` },
              { text: auto, callback_data: `trend_auto_${t.id}`    },
              { text: bear, callback_data: `trend_bearish_${t.id}` },
            ],
          ],
        },
      }
    );
  }
}

const ADD_STEPS = [
  { key: 'name',           prompt: '*Token Name*\nE.g. GramPepe' },
  { key: 'symbol',         prompt: '*Symbol* (ticker)\nE.g. GPEPE' },
  { key: 'price',          prompt: '*Initial Price (USD)*\nE.g. 0.000001' },
  { key: 'market_cap',     prompt: '*Market Cap (USD)*\nE.g. 1000000  (or `skip` for auto)' },
  { key: 'description',    prompt: '*Description*\n(or `skip`)' },
  { key: 'image',          prompt: '*Image URL*\n(or `skip`)' },
  { key: 'volatility',     prompt: '*Volatility* (0.01–0.08)\nDefault: 0.025  (or `skip`)' },
  { key: 'trend_strength', prompt: '*Trend Strength* (0.5–3)\nDefault: 1.2  (or `skip`)' },
  { key: 'pump_chance',    prompt: '*Pump Chance* (0–0.2)\nDefault: 0.06  (or `skip`)' },
  { key: 'tx_speed',       prompt: '*TX Speed* (ms between transactions)\nDefault: 2500  (or `skip`)' },
];

function startAddFlow(chatId, bot, userId) {
  sessions.set(userId, { flow: 'add', step: 0, data: {} });
  bot.sendMessage(chatId, ADD_STEPS[0].prompt + '\n\n_(Send /cancel to abort)_', { parse_mode: 'Markdown' });
}

function handleAddStep(bot, msg, session) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const step   = ADD_STEPS[session.step];
  const val    = msg.text.trim();

  if (val.toLowerCase() === '/cancel') {
    sessions.delete(userId);
    return bot.sendMessage(chatId, 'Cancelled.');
  }

  const defaults = {
    market_cap: null, description: '', image: '',
    volatility: 0.025, trend_strength: 1.2, pump_chance: 0.06, tx_speed: 2500,
  };

  if (val.toLowerCase() === 'skip' && step.key in defaults) {
    session.data[step.key] = defaults[step.key];
  } else {
    const numericKeys = ['price', 'market_cap', 'volatility', 'trend_strength', 'pump_chance', 'tx_speed'];
    session.data[step.key] = numericKeys.includes(step.key) ? parseFloat(val) : val;
  }

  session.step++;

  if (session.step >= ADD_STEPS.length) {
    sessions.delete(userId);
    const d           = session.data;
    const price       = d.price;
    const mc          = d.market_cap || price * 1e9;
    const totalSupply = Math.round(mc / price);

    const result = db.prepare(`
      INSERT INTO tokens (name, symbol, image, description, price, initial_price, total_supply,
                          market_cap, volatility, trend_strength, pump_chance, tx_speed, candle_interval)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 900)
    `).run(
      d.name, d.symbol.toUpperCase(), d.image || '', d.description || '',
      price, price, totalSupply, mc,
      d.volatility, d.trend_strength, d.pump_chance, d.tx_speed
    );

    const token = db.prepare('SELECT * FROM tokens WHERE id = ?').get(result.lastInsertRowid);
    seedCandlesForToken(token);
    addTokenToSimulator(token, global._io);

    bot.sendMessage(chatId,
      `*${token.name}* (${token.symbol}) added!\n\nPrice: $${formatPrice(token.price)}\nTrend: ${token.trend_strength}x | Volatility: ${token.volatility}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(chatId, ADD_STEPS[session.step].prompt, { parse_mode: 'Markdown' });
  }
}

function startBot(io) {
  global._io = io;
  const token      = process.env.BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;

  if (!token) {
    console.warn('[Bot] BOT_TOKEN not set — Telegram bot disabled');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name   = msg.from?.first_name || 'trader';
    bot.sendMessage(chatId,
      `Welcome, ${name}!\n\nTON Meme DEX — the hottest meme coins on the TON network.\n\nTrade, track, and moon together.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Open TON Meme DEX', web_app: { url: miniAppUrl || 'https://your-app-url.com' } },
          ]],
        },
      }
    );
  });

  bot.onText(/\/tokens/, (msg) => {
    const tokens = db.prepare('SELECT * FROM tokens WHERE active=1 ORDER BY market_cap DESC').all();
    if (!tokens.length) return bot.sendMessage(msg.chat.id, 'No tokens listed yet.');
    const lines = tokens.map((t, i) =>
      `${i + 1}. *${t.name}* (${t.symbol})\n   $${formatPrice(t.price)}  ${t.change_24h >= 0 ? '+' : ''}${Number(t.change_24h).toFixed(1)}%`
    );
    bot.sendMessage(msg.chat.id, `*Listed Tokens*\n\n${lines.join('\n\n')}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Open DEX', web_app: { url: miniAppUrl || 'https://your-app-url.com' } }]] },
    });
  });

  bot.onText(/\/myid/, (msg) => {
    bot.sendMessage(msg.chat.id, `Your Telegram ID: \`${msg.from.id}\`\n\nSet this as ADMIN_TELEGRAM_ID in your .env file.`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/admin/, (msg) => {
    if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, 'Not authorized.');
    adminMenu(msg.chat.id, bot);
  });

  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const session = sessions.get(msg.from?.id);
    if (!session) return;
    if (session.flow === 'add') handleAddStep(bot, msg, session);
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data   = query.data;
    bot.answerCallbackQuery(query.id);

    if (!isAdmin(query)) return bot.sendMessage(chatId, 'Not authorized.');

    if (data === 'admin_list')  return listTokens(chatId, bot);
    if (data === 'admin_add')   return startAddFlow(chatId, bot, userId);

    if (data === 'admin_stats') {
      const total   = db.prepare('SELECT COUNT(*) as c FROM tokens WHERE active=1').get().c;
      const txns    = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
      const vol     = db.prepare('SELECT SUM(total) as v FROM transactions').get().v || 0;
      const wallets = db.prepare('SELECT COUNT(DISTINCT wallet) as c FROM portfolios').get().c;
      return bot.sendMessage(chatId,
        `*Platform Stats*\n\nActive tokens: ${total}\nTotal transactions: ${txns}\nTotal volume: $${Number(vol).toFixed(2)}\nUnique wallets: ${wallets}`,
        { parse_mode: 'Markdown' }
      );
    }

    if (data.startsWith('toggle_')) {
      const id = data.split('_')[1];
      const t  = db.prepare('SELECT active, name FROM tokens WHERE id=?').get(id);
      db.prepare('UPDATE tokens SET active=? WHERE id=?').run(t.active ? 0 : 1, id);
      return bot.sendMessage(chatId, `${t.active ? 'Disabled' : 'Enabled'} *${t.name}*`, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('reset_')) {
      const id = data.split('_')[1];
      const t  = db.prepare('SELECT * FROM tokens WHERE id=?').get(id);
      db.prepare('DELETE FROM candlesticks WHERE token_id=?').run(id);
      db.prepare('UPDATE tokens SET price=initial_price WHERE id=?').run(id);
      const fresh = db.prepare('SELECT * FROM tokens WHERE id=?').get(id);
      seedCandlesForToken(fresh);
      return bot.sendMessage(chatId, `Chart reset for *${t.name}*`, { parse_mode: 'Markdown' });
    }

    if (data.startsWith('delete_')) {
      const id = data.split('_')[1];
      const t  = db.prepare('SELECT name FROM tokens WHERE id=?').get(id);
      db.prepare('DELETE FROM tokens WHERE id=?').run(id);
      return bot.sendMessage(chatId, `*${t.name}* permanently deleted.`, { parse_mode: 'Markdown' });
    }

    // Trend control: trend_bullish_ID, trend_auto_ID, trend_bearish_ID
    if (data.startsWith('trend_')) {
      const parts = data.split('_');
      const mode  = parts[1];   // bullish | auto | bearish
      const id    = parts[2];

      if (!['bullish', 'auto', 'bearish'].includes(mode)) return;

      const token = db.prepare('SELECT name, price FROM tokens WHERE id=?').get(id);
      if (!token) return bot.sendMessage(chatId, 'Token not found.');

      const peak = mode === 'bearish' ? token.price : null;
      db.prepare('UPDATE tokens SET trend_mode=?, trend_peak_price=? WHERE id=?').run(mode, peak, id);

      const label = trendLabel(mode);
      const extra = mode === 'bearish'
        ? `\nPrice cap set at $${formatPrice(token.price)} — price will not exceed this while bearish.`
        : '';

      return bot.sendMessage(chatId,
        `*${token.name}* trend set to *${label}*${extra}`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  bot.on('polling_error', (err) => console.error('[Bot]', err.message));
  console.log('[Bot] Telegram bot started');
  return bot;
}

module.exports = { startBot };
