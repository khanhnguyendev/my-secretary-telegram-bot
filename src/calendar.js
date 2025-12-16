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

module.exports = { createEvent };
