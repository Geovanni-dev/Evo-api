import { createClient } from 'redis'; // Import the createClient function from the redis library

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'; // Get the Redis URL from the environment variable

// Create a new Redis client with the provided URL
const client = createClient({
  url: redisUrl,
  socket: {
    keepAlive: true,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});
client.on('error', (error) => {
  console.error('Redis error:', error); // Log any errors that occur with the Redis client
});

client.on('connect', () => {
  console.log('Client Redis Conectado'); // Log a message when the Redis client is connected
});

await client.connect(); // Connect to the Redis server

export default client;
