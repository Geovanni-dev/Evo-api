import client from '../../redis/client.js';

const TTL = 60 * 60 * 24 * 30; // 30 days in seconds

//================= types

export type PreferencesCacheData = {
  dietType?: string;
  dietCategory?: string;
  suplementUse?: string;
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
  const key = generatePreferencesKey(userId);
  const jsonData = JSON.stringify(data);
  await client.set(key, jsonData, { EX: TTL });
};

// ================== restrictions
export const setRestrictionsCache = async (
  userId: string,
  data: RestrictionsCacheData,
) => {
  const key = generateRestrictionsKey(userId);
  const jsonData = JSON.stringify(data);
  await client.set(key, jsonData, { EX: TTL });
};

// ================== preferences
export const getPreferencesCache = async (userId: string) => {
  const key = generatePreferencesKey(userId);
  const raw = await client.get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

// ================== restrictions
export const getRestrictionsCache = async (userId: string) => {
  const key = generateRestrictionsKey(userId);
  const raw = await client.get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

// ================== preferences
export const deletePreferencesCache = async (userId: string) => {
  const key = generatePreferencesKey(userId);
  await client.del(key);
};

// ================== restrictions
export const deleteRestrictionsCache = async (userId: string) => {
  const key = generateRestrictionsKey(userId);
  await client.del(key);
};
