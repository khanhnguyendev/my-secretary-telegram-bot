const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
const crypto = require('crypto');
const logger = require('./logger');

const { BOT_TOKEN, ALLOWED_USERS } = require('./config');
const { parseInput } = require('./parser');
const { resolveDate } = require('./dateResolver');
const { createEvent, deleteEventsByDay, listEventsByDay } = require('./calendar');
const { formatEventTitle } = require('./titleFormatter');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// In-memory undo buffer for the most recent /clear operation
let undoBuffer = null;

bot.on('message', async (msg) => {
  const requestId = crypto.randomUUID();

  if (!msg.text) return;

  // Log incoming message
  const text = msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;
  logger.info({ requestId, chatId: msg.chat.id, userId: msg.from.id, text }, 'Incoming message');

  // Permission check
  if (!ALLOWED_USERS.includes(msg.from.id)) {
    logger.warn({ requestId, chatId: msg.chat.id, userId: msg.from.id }, 'Unauthorized access attempt');
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  // Skip event creation for /clear and /undo commands
  if (msg.text.startsWith('/clear') || msg.text.startsWith('/undo')) return;

  // Skip event creation for /clear and /undo commands
  if (msg.text.startsWith('/clear') || msg.text.startsWith('/undo')) return;

  const lines = msg.text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const results = [];
  let failed = 0;

  for (const line of lines) {
    const parsed = parseInput(line);

    if (!parsed) {
      logger.warn({ requestId, line: line.length > 50 ? line.substring(0,50) + '...' : line }, 'Failed to parse line');
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

      logger.info({ requestId, title, start: start.format('HH:mm'), end: end.format('HH:mm') }, 'Event created');

      results.push({
        title,
        start,
        end
      });
    } catch (err) {
      logger.error({ requestId, err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }, 'Event creation failed');
      failed++;
    }
  }

  logger.info({ requestId, parsedCount: results.length, failedCount: failed }, 'Event parsing completed');

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
  const requestId = crypto.randomUUID();

  if (!ALLOWED_USERS.includes(msg.from.id)) {
    logger.warn({ requestId, chatId: msg.chat.id, userId: msg.from.id }, 'Unauthorized /clear attempt');
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  logger.info({ requestId, chatId: msg.chat.id, userId: msg.from.id, arg: match[1] }, 'Clear command received');

  let arg = match[1]?.trim();
  let confirm = false;

  if (arg && arg.endsWith(' confirm')) {
    confirm = true;
    arg = arg.slice(0, -8).trim();
  }

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

  if (!confirm) {
    try {
      const events = await listEventsByDay(date);
      const count = events.length;
      if (count === 0) {
        await bot.sendMessage(msg.chat.id, `ℹ️ No events found on ${date.format('YYYY-MM-DD')}`);
        logger.info({ requestId, date: date.format('YYYY-MM-DD'), eventCount: 0 }, 'No events to clear');
        return;
      }

      let reply = `⚠️ This will delete ${count} event(s) on ${date.format('YYYY-MM-DD')}\n\n`;

      const displayCount = Math.min(count, 10);
      events.slice(0, displayCount).forEach((event, i) => {
        const title = event.summary || '(Untitled)';
        const start = dayjs(event.start.dateTime).format('HH:mm');
        const end = dayjs(event.end.dateTime).format('HH:mm');
        reply += `${i + 1}️⃣ ${title}\n🕒 ${start}–${end}\n\n`;
      });

      if (count > 10) {
        reply += `...and ${count - 10} more\n\n`;
      }

      reply += `Type \`/clear ${arg || 'today'} confirm\` to proceed.`;

      await bot.sendMessage(msg.chat.id, reply.trim());
      logger.info({ requestId, date: date.format('YYYY-MM-DD'), eventCount: count }, 'Clear confirmation requested');
    } catch (err) {
      logger.error({ requestId, err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }, 'List events failed');
      await bot.sendMessage(msg.chat.id, '❌ Failed to check events.');
    }
  } else {
    try {
      const deletedEvents = await deleteEventsByDay(date);
      undoBuffer = deletedEvents;

      logger.info({ requestId, date: date.format('YYYY-MM-DD'), deletedCount: deletedEvents.length }, 'Events deleted');

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
      logger.error({ requestId, err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }, 'Clear command failed');
      await bot.sendMessage(msg.chat.id, '❌ Failed to delete events.');
    }
  }
});

bot.onText(/^\/undo$/, async (msg) => {
  const requestId = crypto.randomUUID();

  if (!ALLOWED_USERS.includes(msg.from.id)) {
    logger.warn({ requestId, chatId: msg.chat.id, userId: msg.from.id }, 'Unauthorized /undo attempt');
    await bot.sendMessage(msg.chat.id, '❌ You are not allowed to use this bot.');
    return;
  }

  logger.info({ requestId, chatId: msg.chat.id, userId: msg.from.id }, 'Undo command received');

  if (!undoBuffer || undoBuffer.length === 0) {
    logger.info({ requestId }, 'Nothing to undo');
    await bot.sendMessage(msg.chat.id, '❌ Nothing to undo.');
    return;
  }

  try {
    const results = [];
    for (const event of undoBuffer) {
      await createEvent({
        title: event.title,
        location: event.location || '',
        start: event.start,
        end: event.end,
        createdBy: 'Restored by /undo'
      });
      results.push(event);
    }

    undoBuffer = null; // Clear the undo buffer after successful restore

    logger.info({ requestId, restoredCount: results.length }, 'Events restored');

    let reply = `✅ Restored ${results.length} event(s)\n\n`;

    results.forEach((e, i) => {
      const start = dayjs(e.start).format('HH:mm');
      const end = dayjs(e.end).format('HH:mm');
      reply += `${i + 1}️⃣ ${e.title}\n🕒 ${start}–${end}\n\n`;
    });

    await bot.sendMessage(msg.chat.id, reply.trim());
  } catch (err) {
    logger.error({ requestId, err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }, 'Undo command failed');
    await bot.sendMessage(msg.chat.id, '❌ Failed to restore events.');
  }
});

module.exports = bot;
