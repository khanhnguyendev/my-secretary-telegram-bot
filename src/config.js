module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  CALENDAR_ID: process.env.CALENDAR_ID,
  SERVICE_ACCOUNT_JSON: process.env.SERVICE_ACCOUNT_JSON,
  ALLOWED_USERS: process.env.ALLOWED_USERS
    ? process.env.ALLOWED_USERS.split(',').map(Number)
    : [],
  TIMEZONE: 'Asia/Ho_Chi_Minh'
};
