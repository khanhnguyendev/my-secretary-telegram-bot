const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');

const { BOT_TOKEN, ALLOWED_USERS } = require('./config');
const { parseInput } = require('./parser');
const { resolveDate } = require('./dateResolver');
const { createEvent, deleteEventsByDay } = require('./calendar');
const { formatEventTitle } = require('./titleFormatter');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  if (!msg.text) return;

  // Permission check
  if (!ALLOWED_USERS.includes(msg.from.id)) {
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  // Skip event creation for /clear commands
  if (msg.text.startsWith('/clear')) return;

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

bot.onText(/^\/clear(?:\s+(.+))?$/, async (msg, match) => {
  if (!ALLOWED_USERS.includes(msg.from.id)) {
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  const arg = match[1]?.trim();
  let date;

  if (!arg || arg === 'today') {
    date = dayjs();
  } else if (arg === 'tomorrow') {
    date = dayjs().add(1, 'day');
  } else {
    const parsed = dayjs(arg);
    if (!parsed.isValid()) {
      await bot.sendMessage(msg.chat.id, '❌ Invalid date format. Use /clear, /clear today, /clear tomorrow, or /clear YYYY-MM-DD');
      return;
    }
    date = parsed;
  }

  try {
    const deletedEvents = await deleteEventsByDay(date);

    if (deletedEvents.length === 0) {
      await bot.sendMessage(msg.chat.id, `ℹ️ No events found on ${date.format('YYYY-MM-DD')}`);
      return;
    }

    let reply = `🗑️ Deleted ${deletedEvents.length} event(s)\n📅 ${date.format('YYYY-MM-DD')}\n\n`;

    deletedEvents.forEach((event, i) => {
      const start = dayjs(event.start).format('HH:mm');
      const end = dayjs(event.end).format('HH:mm');
      reply += `${i + 1}️⃣ ${event.title}\n🕒 ${start}–${end}\n\n`;
    });

    await bot.sendMessage(msg.chat.id, reply.trim());
  } catch (err) {
    console.error('Delete events failed:', err.message);
    await bot.sendMessage(msg.chat.id, '❌ Failed to delete events.');
  }
});

module.exports = bot;
