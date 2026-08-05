import redisClient from '../../redis/client.js';

const TTL = 60 * 60 * 12; // 12 hours in seconds / fallback

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
  };
  tdee: number | null;
};

//============================================= generateKey

export const generateKey = (userId: string, date: Date) => {
  const dateString = date.toISOString().split('T')[0];
  return `meals:${userId}:${dateString}`;
};

//============================= setDailyCache

export const setDailyCache = async (
  userId: string,
  date: Date,
  data: Record<string, unknown>,
): Promise<void> => {
  const key = generateKey(userId, date);
  const jsonData = JSON.stringify(data);
  await redisClient.set(key, jsonData, { EX: TTL });
};

//============================= getDailyCache

export const getDailyCache = async (
  userId: string,
  date: Date,
): Promise<DailyCacheData | null> => {
  const key = generateKey(userId, date);
  const raw = await redisClient.get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

//============================= deleteDailyCache

export const deleteDailyCache = async (
  userId: string,
  date: Date,
): Promise<void> => {
  const key = generateKey(userId, date);
  await redisClient.del(key);
};
