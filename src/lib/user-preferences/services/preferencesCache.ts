import client from '../../redis/client.js'; // Import the Redis client

const TTL = 60 * 60 * 24 * 30; // 30 days in seconds

//================= types

export type PreferencesCacheData = {
  dietType?: string;
  mealsPerDay?: number;
  likedFoods?: string[];
  dislikedFoods?: string[];
  avoidFoods?: string[];
};

export type RestrictionsCacheData = {
  intolerances?: string[];
  allergies?: string[];
  healthConditions?: string[];
  observations?: string;
};

//=================== key

export const generatePreferencesKey = (userId: string) =>
  `preferences:${userId}`;
export const generateRestrictionsKey = (userId: string) =>
  `restrictions:${userId}`;

// ================== preferences
export const setPreferencesCache = async (
  userId: string,
  data: PreferencesCacheData,
) => {
  const key = generatePreferencesKey(userId); // Generate the key for the Redis cache
  const jsonData = JSON.stringify(data); // Convert the data to JSON
  await client.set(key, jsonData, { EX: TTL }); // set the preferences data in the Redis cache
};

// ================== restrictions
export const setRestrictionsCache = async (
  userId: string,
  data: RestrictionsCacheData,
) => {
  const key = generateRestrictionsKey(userId); // Generate the key for the Redis cache
  const jsonData = JSON.stringify(data); // Convert the data to JSON
  await client.set(key, jsonData, { EX: TTL }); // set the preferences data in the Redis cache
};

// ================== preferences
export const getPreferencesCache = async (userId: string) => {
  const key = generatePreferencesKey(userId); // Generate the key for the Redis cache
  const raw = await client.get(key); // Get the meals data from the Redis cache
  if (!raw) {
    return null;
  }
  return JSON.parse(raw); // Parse the JSON data and return it
};

// ================== restrictions
export const getRestrictionsCache = async (userId: string) => {
  const key = generateRestrictionsKey(userId); // Generate the key for the Redis cache
  const raw = await client.get(key); // Get the meals data from the Redis cache
  if (!raw) {
    return null;
  }
  return JSON.parse(raw); // Parse the JSON data and return it
};

// ================== preferences
export const deletePreferencesCache = async (userId: string) => {
  const key = generatePreferencesKey(userId); // Generate the key for the Redis cache
  await client.del(key);
};

// ================== restrictions
export const deleteRestrictionsCache = async (userId: string) => {
  const key = generateRestrictionsKey(userId); // Generate the key for the Redis cache
  await client.del(key);
};
