const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { TIMEZONE } = require('./config');

dayjs.extend(utc);
dayjs.extend(timezone);

function resolveDate(dateToken) {
  let base = dayjs().tz(TIMEZONE);

  if (dateToken === 'mai') base = base.add(1, 'day');

  if (dateToken?.startsWith('T') || dateToken === 'CN') {
    // Map Vietnamese day to weekday number (0=Sunday, 1=Monday, etc.)
    const dayMap = {
      'T2': 1, // Monday
      'T3': 2, // Tuesday
      'T4': 3, // Wednesday
      'T5': 4, // Thursday
      'T6': 5, // Friday
      'T7': 6, // Saturday
      'CN': 0  // Sunday
    };

    const target = dayMap[dateToken.toUpperCase()];
    if (target !== undefined) {
      const currentWeekday = base.day();
      let daysToAdd = target - currentWeekday;
      if (daysToAdd < 0) {
        daysToAdd += 7;
      }
      base = base.add(daysToAdd, 'day');
    }
  }

  return base;
}

// New function to get the next occurrence of a specific weekday (0=Sunday, 1=Monday, etc.)
function getNextWeekday(weekday) {
  const today = dayjs().tz(TIMEZONE);
  const currentWeekday = today.day(); // 0=Sunday, 1=Monday, etc.
  let daysToAdd = weekday - currentWeekday;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  return today.add(daysToAdd, 'day');
}

module.exports = { resolveDate, getNextWeekday };
