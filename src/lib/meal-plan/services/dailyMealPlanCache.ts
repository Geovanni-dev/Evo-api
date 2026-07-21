import redisClient from '../../redis/client.js';

const TTL = 60 * 60 * 24; // 24 hours

// ======================= types

type DailyDietItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DailyDietMeal = {
  mealType: string;
  items: DailyDietItem[];
};

export type DailyDietCacheData = {
  date: string;
  meals: DailyDietMeal[];
  tdee?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

// ========================== keys
const generateKey = (userId: string, date: string): string =>
  `daily_diet:${userId}:${date}`;

// ===================cache functions

export const setDailyDietCache = async (
  userId: string,
  date: string,
  data: DailyDietCacheData,
): Promise<void> => {
  const key = generateKey(userId, date); // Generate the key for the Redis cache
  await redisClient.set(key, JSON.stringify(data), { EX: TTL }); // Set the meals data in the Redis cache
};

export const getDailyDietCache = async (
  userId: string,
  date: string,
): Promise<DailyDietCacheData | null> => {
  const key = generateKey(userId, date);
  const raw = await redisClient.get(key); //get the daily diet data from Redis
  if (!raw) return null;
  return JSON.parse(raw) as DailyDietCacheData;
};

export const deleteDailyDietCache = async (
  userId: string,
  date: string,
): Promise<void> => {
  const key = generateKey(userId, date); // Generate the key for the Redis cache
  await redisClient.del(key);
};
