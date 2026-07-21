import redisClient from '../../redis/client.js'; // Import the Redis client

const TTL = 60 * 60 * 24 * 1; // 1 day in seconds

//============================= types

type MealPlanCacheDate = {
  id: string;
  userId: string;
  planJson: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

//=====================generateKey

const generateKey = (userId: string): string => `mealPlan:${userId}`; // Return the generated key

//=====================setDailyCache

export const setMealPlanCache = async (
  userId: string,
  data: MealPlanCacheDate,
): Promise<void> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  const jsonData = JSON.stringify(data); // Convert the data to JSON
  await redisClient.set(key, jsonData, { EX: TTL }); // Set the meals data in the Redis cache with a TTL of 1 day
};

//=====================getDailyCache

export const getMealPlanCache = async (
  userId: string,
): Promise<MealPlanCacheDate | null> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  const raw = await redisClient.get(key); // Get the mealPlan data from the Redis cache
  if (!raw) {
    return null;
  }
  return JSON.parse(raw); // Parse the JSON data and return it
};

//=====================deleteDailyCache

export const deleteMealPlanCache = async (userId: string): Promise<void> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  await redisClient.del(key);
};
