const dayjs = require('dayjs');

function resolveDate(dateToken) {
  let base = dayjs();

  if (dateToken === 'mai') base = base.add(1, 'day');

  if (dateToken?.startsWith('T')) {
    const target = Number(dateToken[1]);
    const diff = (target + 7 - base.day()) % 7;
    base = base.add(diff || 7, 'day');
  }

  return base;
}

module.exports = { resolveDate };
