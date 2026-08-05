import redisClient from '../../redis/client.js';

const TTL = 60 * 60 * 24 * 7; // 1 week in seconds

//============================= types

type NutritionGoalData = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

//=====================generateKey

const generateKey = (userId: string): string => `nutrition-goals:${userId}`;

//=====================setDailyCache

export const setNutritionGoalCache = async (
  userId: string,
  data: NutritionGoalData,
): Promise<void> => {
  const key = generateKey(userId);
  const jsonData = JSON.stringify(data);
  await redisClient.set(key, jsonData, { EX: TTL });
};

//=====================getDailyCache

export const getNutritionGoalCache = async (
  userId: string,
): Promise<NutritionGoalData | null> => {
  const key = generateKey(userId);
  const raw = await redisClient.get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

//=====================deleteDailyCache

export const deleteNutritionGoalCache = async (
  userId: string,
): Promise<void> => {
  const key = generateKey(userId);
  await redisClient.del(key);
};
