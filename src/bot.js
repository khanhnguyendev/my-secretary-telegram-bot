const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const crypto = require('crypto');
const logger = require('./logger');

dayjs.extend(utc);
dayjs.extend(timezone);

const { BOT_TOKEN, ALLOWED_USERS, TIMEZONE } = require('./config');
const { parseInput, parseGroupedInput } = require('./parser');
const { resolveDate, getNextWeekday } = require('./dateResolver');
const { createEvent, deleteEventsByDay, listEventsByDay, checkConflicts } = require('./calendar');
const { formatEventTitle } = require('./titleFormatter');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// In-memory undo buffer for the most recent /clear operation
let undoBuffer = null;

// Pending creations awaiting conflict confirmation
const pendingCreations = {}; // chatId -> { type: 'create', events: [...], conflicts: [...] }

bot.on('message', async (msg) => {
  const requestId = crypto.randomUUID();

  if (!msg.text) return;

  // Handle pending confirmations
  const lower = msg.text.toLowerCase().trim();
  if ((lower === 'yes' || lower === 'no') && pendingCreations[msg.chat.id]) {
    const pending = pendingCreations[msg.chat.id];
    if (pending.type === 'create') {
      if (lower === 'yes') {
        const created = [];
        for (const e of pending.events) {
          try {
            await createEvent({
              title: e.title,
              location: e.location,
              start: e.start.toISOString(),
              end: e.end.toISOString(),
              createdBy: `@${msg.from.username || msg.from.id}`,
              chatId: msg.chat.id,
              messageId: msg.message_id
            });
            created.push(e);
            logger.info({ requestId, title: e.title, start: e.start.format('HH:mm'), end: e.end.format('HH:mm') }, 'Event created after confirmation');
          } catch (err) {
            logger.error({ requestId, err: err.message }, 'Event creation failed after confirmation');
          }
        }
        if (created.length > 0) {
          let reply = `✅ Created ${created.length} event(s) after confirmation\n\n`;
          created.forEach((e, i) => {
            const dateStr = e.start.format('ddd, DD/MM/YYYY');
            reply += `${i + 1}️⃣ ${e.title}\n📅 ${dateStr}\n🕒 ${e.start.format('HH:mm')}–${e.end.format('HH:mm')}\n\n`;
          });
          await bot.sendMessage(msg.chat.id, reply.trim());
        }
      } else {
        await bot.sendMessage(msg.chat.id, '❌ Event creation cancelled.');
        logger.info({ requestId }, 'Event creation cancelled by user');
      }
    }
    delete pendingCreations[msg.chat.id];
    return;
  }

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

  let parsedEvents = [];
  let failed = 0;

  // Check if it's a grouped schedule (has bullet points)
  const hasBullets = lines.some(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*'));

  if (hasBullets) {
    // Use grouped parser
    const groupedEvents = parseGroupedInput(msg.text);
    // Calculate dates and format titles
    for (const event of groupedEvents) {
      event.date = getNextWeekday(event.weekday);
      const [startHour, startMin] = event.start_time.split(':').map(Number);
      const [endHour, endMin] = event.end_time.split(':').map(Number);
      const start = event.date.hour(startHour).minute(startMin);
      const end = event.date.hour(endHour).minute(endMin);
      const title = formatEventTitle({
        rawTitle: event.title
      });
      parsedEvents.push({
        title,
        location: '',
        start,
        end
      });
    }
  } else {
    // Use individual line parser
    for (const line of lines) {
      const parsed = parseInput(line);

      if (!parsed) {
        logger.warn({ requestId, line: line.length > 50 ? line.substring(0,50) + '...' : line }, 'Failed to parse line');
        failed++;
        continue;
      }

      const date = resolveDate(parsed.date);

      const [startHour, startMin] = parsed.start_time.split(':').map(Number);
      const [endHour, endMin] = parsed.end_time.split(':').map(Number);

      const start = date.hour(startHour).minute(startMin);
      const end = date.hour(endHour).minute(endMin);

      const title = formatEventTitle({
        rawTitle: parsed.title
      });

      parsedEvents.push({
        title,
        location: parsed.location,
        start,
        end
      });
    }
  }

  logger.info({ requestId, parsedCount: parsedEvents.length, failedCount: failed }, 'Event parsing completed');

  if (!parsedEvents.length) {
    await bot.sendMessage(
      msg.chat.id,
      '❌ No valid events were created. Please check the format.\nExample:\n16-18: badminton'
    );
    return;
  }

  // Check for conflicts before creating
  let allConflicts = [];
  let hasConflict = false;
  for (const e of parsedEvents) {
    const day = e.start.startOf('day');
    const conflicts = await checkConflicts(day, e.start.hour(), e.start.minute(), e.end.hour(), e.end.minute());
    if (conflicts.length > 0) {
      hasConflict = true;
      allConflicts.push(...conflicts);
    }
  }

  if (hasConflict) {
    const uniqueConflicts = [...new Set(allConflicts.map(JSON.stringify))].map(JSON.parse); // unique by stringify
    pendingCreations[msg.chat.id] = { type: 'create', events: parsedEvents, conflicts: uniqueConflicts };
    let reply = `⚠️ Conflict detected with existing events:\n\n`;
    uniqueConflicts.forEach((event, i) => {
      const title = event.summary || '(Untitled)';
      const dateStr = dayjs(event.start.dateTime).tz(TIMEZONE).format('ddd, DD/MM/YYYY');
      const start = dayjs(event.start.dateTime).tz(TIMEZONE).format('HH:mm');
      const end = dayjs(event.end.dateTime).tz(TIMEZONE).format('HH:mm');
      reply += `${i + 1}️⃣ ${title}\n📅 ${dateStr}\n🕒 ${start}–${end}\n\n`;
    });
    reply += `Create anyway? (yes/no)`;
    await bot.sendMessage(msg.chat.id, reply.trim());
    logger.info({ requestId, conflictCount: uniqueConflicts.length }, 'Conflict detected, awaiting confirmation');
  } else {
    // Create all events
    const results = [];
    for (const e of parsedEvents) {
      try {
        const result = await createEvent({
          title: e.title,
          location: e.location,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
          createdBy: `@${msg.from.username || msg.from.id}`,
          chatId: msg.chat.id,
          messageId: msg.message_id
        });

        if (result.retried) {
          await bot.sendMessage(msg.chat.id, '⚠️ Conflict detected. Retrying…');
        }

        logger.info({ requestId, title: e.title, start: e.start.format('HH:mm'), end: e.end.format('HH:mm') }, 'Event created');

        results.push(e);
      } catch (err) {
        logger.error({ requestId, err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }, 'Event creation failed');
        failed++;
      }
    }

    let reply = `✅ Created ${results.length} event(s)\n\n`;
    results.forEach((e, i) => {
      const dateStr = e.start.format('ddd, DD/MM/YYYY');
      reply += `${i + 1}️⃣ ${e.title}\n📅 ${dateStr}\n🕒 ${e.start.format('HH:mm')}–${e.end.format('HH:mm')}\n\n`;
    });
    if (failed) {
      reply += `⚠️ Skipped ${failed} invalid line(s)`;
    }
    await bot.sendMessage(msg.chat.id, reply.trim());
  }
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
    date = dayjs().tz(TIMEZONE);
  } else if (arg === 'tomorrow') {
    date = dayjs().tz(TIMEZONE).add(1, 'day');
  } else {
    const parsed = dayjs(arg);
    if (!parsed.isValid()) {
      await bot.sendMessage(msg.chat.id, '❌ Invalid date format. Use /clear, /clear today, /clear tomorrow, or /clear YYYY-MM-DD');
      return;
    }
    date = parsed.tz(TIMEZONE);
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
        const start = dayjs(event.start.dateTime).tz(TIMEZONE).format('HH:mm');
        const end = dayjs(event.end.dateTime).tz(TIMEZONE).format('HH:mm');
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
        createdBy: 'Restored by /undo',
        chatId: msg.chat.id,
        messageId: msg.message_id
      });
      results.push(event);
    }

    undoBuffer = null; // Clear the undo buffer after successful restore

    logger.info({ requestId, restoredCount: results.length }, 'Events restored');

    let reply = `✅ Restored ${results.length} event(s)\n\n`;

    results.forEach((e, i) => {
      const dateStr = dayjs(e.start).tz(TIMEZONE).format('ddd, DD/MM/YYYY');
      const start = dayjs(e.start).tz(TIMEZONE).format('HH:mm');
      const end = dayjs(e.end).tz(TIMEZONE).format('HH:mm');
      reply += `${i + 1}️⃣ ${e.title}\n📅 ${dateStr}\n🕒 ${start}–${end}\n\n`;
    });

    await bot.sendMessage(msg.chat.id, reply.trim());
  } catch (err) {
    logger.error({ requestId, err: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined }, 'Undo command failed');
    await bot.sendMessage(msg.chat.id, '❌ Failed to restore events.');
  }
});

module.exports = bot;
