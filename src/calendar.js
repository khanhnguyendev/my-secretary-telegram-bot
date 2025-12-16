const { google } = require('googleapis');
const dayjs = require('dayjs');
const { SERVICE_ACCOUNT_JSON, CALENDAR_ID, TIMEZONE } = require('./config');

const credentials = JSON.parse(
  Buffer.from(SERVICE_ACCOUNT_JSON, 'base64').toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

async function listEventsByDay(date) {
  const startOfDay = date.startOf('day').toISOString();
  const endOfDay = date.endOf('day').toISOString();

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startOfDay,
    timeMax: endOfDay,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = response.data.items || [];
  return events.filter(event => event.description && event.description.includes('[bot=ryan-mimi]')).slice(0, 20);
}

async function createEvent({ title, location, start, end, createdBy, chatId, messageId }) {
  return calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: title,
      location,
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
      description: `Created by ${createdBy}\n[bot=ryan-mimi]\n[source=telegram]\n[chatId=${chatId}]\n[messageId=${messageId}]`
    }
  });
}

async function deleteEventsByDay(date) {
  const startOfDay = date.startOf('day').toISOString();
  const endOfDay = date.endOf('day').toISOString();

  // List events for the day
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startOfDay,
    timeMax: endOfDay,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = response.data.items || [];

  // Filter events created by this bot and limit to 20
  const botEvents = events.filter(event => event.description && event.description.startsWith('Created by')).slice(0, 20);

  const deletedEvents = [];

  for (const event of botEvents) {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: event.id
    });

    deletedEvents.push({
      title: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      location: event.location || ''
    });
  }

  return deletedEvents;
}

async function checkConflicts(date, start, end) {
  const events = await listEventsByDay(date);
  const startTime = date.hour(start).minute(0);
  const endTime = date.hour(end).minute(0);

  return events.filter(event => {
    const eStart = dayjs(event.start.dateTime);
    const eEnd = dayjs(event.end.dateTime);
    return eStart.isBefore(endTime) && eEnd.isAfter(startTime);
  });
}

module.exports = { createEvent, deleteEventsByDay, listEventsByDay, checkConflicts };
