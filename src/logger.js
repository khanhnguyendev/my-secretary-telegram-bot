const pino = require('pino');

let logger;

if (process.env.NODE_ENV !== 'production') {
  logger = pino({
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  });
} else {
  logger = pino({
    level: 'info'
  });
}

module.exports = logger;