require('dotenv').config();
const logger = require('./logger');

logger.info('Bot started');
const bot = require('./bot');
console.log('🤖 Calendar Telegram Bot is running...');

module.exports = async (req, res) => {
  if (process.env.VERCEL_URL) {
    const webhookUrl = `https://${process.env.VERCEL_URL}`;
    await bot.setWebHook(webhookUrl);
  }
  if (req.method === 'POST') {
    try {
      await bot.processUpdate(req.body);
      res.status(200).send('OK');
    } catch (error) {
      logger.error(error);
      res.status(500).send('Error processing update');
    }
  } else {
    res.status(200).send('Bot webhook endpoint');
  }
};