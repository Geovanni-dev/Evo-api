import redisClient from '../../redis/client.js'; // Import the Redis client

const TTL = 60 * 60 * 24 * 7; // 1 week in seconds

//============================= types

type NutritionGoalData = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

//=====================generateKey

const generateKey = (userId: string): string => `nutrition-goals:${userId}`; // Return the generated key

//=====================setDailyCache

export const setNutritionGoalCache = async (
  userId: string,
  data: NutritionGoalData,
): Promise<void> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  const jsonData = JSON.stringify(data); // Convert the data to JSON
  await redisClient.set(key, jsonData, { EX: TTL }); // Set the meals data in the Redis cache with a TTL of 1 day
};

//=====================getDailyCache

export const getNutritionGoalCache = async (
  userId: string,
): Promise<NutritionGoalData | null> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  const raw = await redisClient.get(key); // Get the meals data from the Redis cache
  if (!raw) {
    return null;
  }
  return JSON.parse(raw); // Parse the JSON data and return it
};

//=====================deleteDailyCache

export const deleteNutritionGoalCache = async (
  userId: string,
): Promise<void> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  await redisClient.del(key);
};

export default {
  setNutritionGoalCache,
  getNutritionGoalCache,
  deleteNutritionGoalCache,
};
