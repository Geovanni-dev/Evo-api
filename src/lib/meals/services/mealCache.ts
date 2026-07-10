import redisClient from '../../redis/client.js'; // Import the Redis client

const TTL = 60 * 60 * 24; // 1 day in seconds

//============================= types

export type MealItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type CachedMeal = {
  id: string;
  mealType: string;
  items: MealItem[];
  createdAt: Date;
  aiRawResponse: unknown;
};

export type DailyCacheData = {
  meals: CachedMeal[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  tdee: number | null;
};

//============================================= generateKey

export const generateKey = (userId: string, date: Date) => {
  const dateString = date.toISOString().split('T')[0]; // Get the date without time
  return `meals:${userId}:${dateString}`; // Return the generated key
};

//============================= setDailyCache

export const setDailyCache = async (
  userId: string,
  date: Date,
  data: Record<string, unknown>,
): Promise<void> => {
  const key = generateKey(userId, date); // Generate the key for the Redis cache
  const jsonData = JSON.stringify(data); // Convert the data to JSON
  await redisClient.set(key, jsonData, { EX: TTL }); // Set the meals data in the Redis cache with a TTL of 1 day
};

//============================= getDailyCache

export const getDailyCache = async (
  userId: string,
  date: Date,
): Promise<DailyCacheData | null> => {
  const key = generateKey(userId, date); // Generate the key for the Redis cache
  const raw = await redisClient.get(key); // Get the meals data from the Redis cache
  if (!raw) {
    return null;
  }
  return JSON.parse(raw); // Parse the JSON data and return it
};

//============================= deleteDailyCache

export const deleteDailyCache = async (
  userId: string,
  date: Date,
): Promise<void> => {
  const key = generateKey(userId, date); // Generate the key for the Redis cache
  await redisClient.del(key);
};

export default {
  setDailyCache,
  getDailyCache,
  deleteDailyCache,
};
