import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file

//============imports Zod
import {
  RestrictionSchema,
  PreferenceSchema,
} from '../schemas/preferencesSchema.js'; // Import the RestrictionSchema and PreferenceSchema
import type {
  RestrictionPayload,
  PreferencePayload,
} from '../schemas/preferencesSchema.js'; // import the RestrictionPayload and PreferencePayload types

//========== imports Redis
import {
  setPreferencesCache,
  getPreferencesCache,
  deletePreferencesCache,
  setRestrictionsCache,
  getRestrictionsCache,
  deleteRestrictionsCache,
} from './preferencesCache.js'; // Import the setDailyCache, getDailyCache, and deleteDailyCache functions
import type {
  PreferencesCacheData,
  RestrictionsCacheData,
} from './preferencesCache.js';

//=============================== function auxliary

// FUNCTION FOR FILTER UNDEFINED
function filterUndefined<T extends Record<string, unknown>>( // Define a generic function to filter out undefined values
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    // Convert the filtered entries to a new object
    Object.entries(obj).filter(([_, v]) => v !== undefined),
  ) as Partial<T>;
}

//============================== preferencesService

// FUNCTION FOR GET USER PREFERENCES
export const getPreferences = async (userId: string) => {
  const cached = await getPreferencesCache(userId); // Try to get the preferences data from the Redis cache
  if (cached) {
    return cached;
  }
  // Query the database for meals created by the user
  const record = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
  if (!record) return null; // Return null if the record is not found

  const data = filterUndefined(record.preferences as PreferencesCacheData); // Filter out undefined values

  await setPreferencesCache(userId, data); // Set the meals data in the Redis cache
  return data;
};

// FUNCTION FOR UPDATE/CREATE USER PREFERENCES
export const updatePreference = async (
  userId: string,
  payload: PreferencePayload,
) => {
  const parsed = PreferenceSchema.parse(payload); // Parse the payload using the PreferenceSchema
  const current = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
  // Merge the current preferences with the new preferences
  const merged = {
    ...((current?.preferences as object) || {}),
    ...parsed,
  };
  const result = await prisma.userPreferences.upsert({
    where: {
      userId,
    },
    update: {
      preferences: merged,
    },
    create: {
      userId,
      preferences: merged,
    },
  });
  await deletePreferencesCache(userId);
  return result;
};

//============================================== restrictionsService

// FUNCTION FOR GET USER RESTRICTIONS
export const getRestrictions = async (userId: string) => {
  const cached = await getRestrictionsCache(userId); // Try to get the restrictions data from the Redis cache
  if (cached) {
    return cached;
  }
  // Query the database for meals created by the user
  const record = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
  if (!record) return null; // Return null if the record is not found

  const restrictions = record.restrictions as RestrictionsCacheData;

  const raw = {
    intolerances: restrictions.intolerances,
    allergies: restrictions.allergies,
    healthConditions: restrictions.healthConditions,
    observations: restrictions.observations,
  };
  const data = filterUndefined(raw as RestrictionsCacheData);

  await setRestrictionsCache(userId, data); // Set the restrictions data in the Redis cache
  return data;
};

// FUNCTION FOR UPDATE/CREATE USER RESTRICTIONS
export const updateRestriction = async (
  userId: string,
  payload: RestrictionPayload,
) => {
  const parsed = RestrictionSchema.parse(payload); // Parse the payload using the RestrictionSchema

  const current = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });

  // Merge the current restrictions with the new restrictions
  const merged = {
    ...((current?.restrictions as object) || {}),
    ...parsed,
  };
  const result = await prisma.userPreferences.upsert({
    where: {
      userId,
    },
    update: {
      restrictions: merged,
    },
    create: {
      userId,
      restrictions: merged,
    },
  });
  await deleteRestrictionsCache(userId);
  return result;
};
