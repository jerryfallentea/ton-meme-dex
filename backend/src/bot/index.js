const TelegramBot = require('node-telegram-bot-api');

function startBot() {
  const token = process.env.BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;

  if (!token) {
    console.warn('[Bot] BOT_TOKEN not set — Telegram bot disabled');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'trader';

    bot.sendMessage(chatId, `👋 Welcome, ${firstName}!\n\n🚀 *TON Meme DEX* — the fastest-growing meme coin platform on TON network.\n\n💎 Trade, track, and discover the hottest meme coins before they moon.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🚀 Open TON Meme DEX',
            web_app: { url: miniAppUrl || 'https://your-app-url.com' },
          },
        ]],
      },
    });
  });

  bot.onText(/\/tokens/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3001}/api/tokens`);
      const tokens = await response.json();
      if (!tokens.length) return bot.sendMessage(chatId, 'No tokens listed yet.');

      const lines = tokens.map((t, i) =>
        `${i + 1}. *${t.name}* (${t.symbol})\n   💰 $${Number(t.price).toExponential(2)}   📈 ${t.change_24h >= 0 ? '+' : ''}${Number(t.change_24h).toFixed(2)}%`
      );
      bot.sendMessage(chatId, `🔥 *Listed Tokens*\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📊 Open DEX', web_app: { url: miniAppUrl || 'https://your-app-url.com' } },
          ]],
        },
      });
    } catch {
      bot.sendMessage(chatId, 'Could not fetch tokens. Try again shortly.');
    }
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `*TON Meme DEX Commands*\n\n/start — Welcome screen\n/tokens — List all tokens\n/help — This menu`, { parse_mode: 'Markdown' });
  });

  bot.on('polling_error', (err) => {
    console.error('[Bot] Polling error:', err.message);
  });

  console.log('[Bot] Telegram bot started with long polling');
  return bot;
}

module.exports = { startBot };
