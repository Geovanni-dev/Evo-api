import redisClient from '../../redis/client.js';

const TTL = 60 * 60 * 24 * 7; // 7 days in seconds

//============================= types

export type MealPlanCacheDate = {
  id: string;
  userId: string;
  planJson: Record<string, unknown>;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
};

//=====================generateKey

const generateKey = (userId: string): string => `mealPlan:${userId}`;

//=====================setMealPlanCache

export const setMealPlanCache = async (
  userId: string,
  data: MealPlanCacheDate,
): Promise<void> => {
  const key = generateKey(userId);
  const jsonData = JSON.stringify(data);
  await redisClient.set(key, jsonData, { EX: TTL });
};

//=====================getMealPlanCache

export const getMealPlanCache = async (
  userId: string,
): Promise<MealPlanCacheDate | null> => {
  const key = generateKey(userId);
  const raw = await redisClient.get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

//=====================deleteMealPlanCache

export const deleteMealPlanCache = async (userId: string): Promise<void> => {
  const key = generateKey(userId);
  await redisClient.del(key);
};
