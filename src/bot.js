const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');

const { BOT_TOKEN, ALLOWED_USERS } = require('./config');
const { parseInput } = require('./parser');
const { resolveDate } = require('./dateResolver');
const { createEvent } = require('./calendar');
const { formatEventTitle } = require('./titleFormatter');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  if (!msg.text) return;

  if (!ALLOWED_USERS.includes(msg.from.id)) {
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  const parsed = parseInput(msg.text);
  if (!parsed) {
    await bot.sendMessage(
      msg.chat.id,
      '❌ Invalid format. Example: 16-18h: badminton'
    );
    return;
  }

  const date = resolveDate(parsed.date);
  const start = date.hour(parsed.start).minute(0);
  const end = date.hour(parsed.end).minute(0);

  const formatted = formatEventTitle({
    rawTitle: parsed.title
  });

  await createEvent({
    title: formatted.summary,
    location: parsed.location,
    start: start.toISOString(),
    end: end.toISOString(),
    visibility: formatted.visibility,
    createdBy: `@${msg.from.username || msg.from.id}`
  });

  bot.sendMessage(
    msg.chat.id,
    `✅ Event created\n🕒 ${start.format('HH:mm')}–${end.format('HH:mm')}\n📌 ${formatted.display}`
  );
});

module.exports = bot;
