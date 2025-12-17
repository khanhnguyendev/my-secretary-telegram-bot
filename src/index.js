require('dotenv').config();
const logger = require('./logger');

logger.info('Bot started');
require('./bot');
console.log('🤖 Calendar Telegram Bot is running...');
