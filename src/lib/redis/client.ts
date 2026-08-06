import { createClient } from 'redis';
import logger from '../logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
  url: redisUrl,
  socket: {
    keepAlive: true,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});
client.on('error', (error) => {
  logger.error(error, 'Redis error:');
});

client.on('connect', () => {
  logger.info('Client Redis Conectado');
});

await client.connect();

export default client;
