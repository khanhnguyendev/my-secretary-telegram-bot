const { google } = require('googleapis');
const { SERVICE_ACCOUNT_JSON, CALENDAR_ID, TIMEZONE } = require('./config');

const credentials = JSON.parse(
  Buffer.from(SERVICE_ACCOUNT_JSON, 'base64').toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

async function createEvent({ title, location, start, end, createdBy }) {
  return calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: title,
      location,
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
      description: `Created by ${createdBy}`
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

  const deletedEvents = [];

  for (const event of events) {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: event.id
    });

    deletedEvents.push({
      title: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime
    });
  }

  return deletedEvents;
}

module.exports = { createEvent, deleteEventsByDay };
