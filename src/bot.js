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

  // Permission check
  if (!ALLOWED_USERS.includes(msg.from.id)) {
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  const lines = msg.text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const results = [];
  let failed = 0;

  for (const line of lines) {
    const parsed = parseInput(line);

    if (!parsed) {
      failed++;
      continue;
    }

    try {
      const date = resolveDate(parsed.date);

      const start = date.hour(parsed.start).minute(0).second(0);
      const end = date.hour(parsed.end).minute(0).second(0);

      const title = formatEventTitle({
        rawTitle: parsed.title
      });

      await createEvent({
        title,
        location: parsed.location,
        start: start.toISOString(),
        end: end.toISOString(),
        createdBy: `@${msg.from.username || msg.from.id}`
      });

      results.push({
        title,
        start,
        end
      });
    } catch (err) {
      console.error('Create event failed:', err.message);
      failed++;
    }
  }

  if (!results.length) {
    await bot.sendMessage(
      msg.chat.id,
      '❌ No valid events were created. Please check the format.\nExample:\n16-18: badminton'
    );
    return;
  }

  let reply = `✅ Created ${results.length} event(s)\n\n`;

  results.forEach((e, i) => {
    reply +=
      `${i + 1}️⃣ ${e.title}\n` +
      `🕒 ${e.start.format('HH:mm')}–${e.end.format('HH:mm')}\n\n`;
  });

  if (failed) {
    reply += `⚠️ Skipped ${failed} invalid line(s)`;
  }

  await bot.sendMessage(msg.chat.id, reply.trim());
});

module.exports = bot;
