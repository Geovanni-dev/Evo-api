import client from '../../redis/client.js';

const TTL = 24 * 60 * 60;

const generateKey = (userId: string) => `chat:${userId}`;

export const setChatCache = async (
  userId: string,
  role: 'user' | 'assistant',
  text: string,
) => {
  const key = generateKey(userId);
  const turn = JSON.stringify({ role, text });

  const length = await client.rPush(key, turn); // adds the turn to the end of the list; returns the new size of the list
  if (length === 1) {
    await client.expire(key, TTL); //Configure it so the TTL isn't reset with every message.
  }
  return length;
};

export const getChatCache = async (userId: string) => {
  const key = generateKey(userId);
  const turns = await client.lRange(key, 0, -1); // returns the list of turns in the chat
  return turns.map((turn) => JSON.parse(turn));
};

export const deleteChatCache = async (userId: string) => {
  const key = generateKey(userId);
  return await client.del(key);
};
