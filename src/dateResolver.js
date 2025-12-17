const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { TIMEZONE } = require('./config');

dayjs.extend(utc);
dayjs.extend(timezone);

function resolveDate(dateToken) {
  let base = dayjs().tz(TIMEZONE);

  if (dateToken === 'mai') base = base.add(1, 'day');

  if (dateToken?.startsWith('T')) {
    const target = Number(dateToken[1]);
    const diff = (target + 7 - base.day()) % 7;
    base = base.add(diff || 7, 'day');
  }

  return base;
}

module.exports = { resolveDate };
