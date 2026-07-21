import redisClient from '../../redis/client.js'; // Import the Redis client

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
  const key = generateKey(userId); // Generate the key for the Redis cache
  const jsonData = JSON.stringify(data); // Convert the data to JSON
  await redisClient.set(key, jsonData, { EX: TTL }); // Set the meals data in the Redis cache with a TTL of 7 days
};

//=====================getMealPlanCache

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

//=====================deleteMealPlanCache

export const deleteMealPlanCache = async (userId: string): Promise<void> => {
  const key = generateKey(userId); // Generate the key for the Redis cache
  await redisClient.del(key);
};
