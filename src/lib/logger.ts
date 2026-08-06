import pino from 'pino';

const options: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
};

// Use pino-pretty in development for human-readable logs.
// In production, output JSON logs for better integration with log aggregators.
if (process.env.NODE_ENV !== 'production') {
  options.transport = {
    target: 'pino-pretty',
  };
}

const logger = pino(options);

export default logger;
