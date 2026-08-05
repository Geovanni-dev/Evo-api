import prisma from '../../prisma/prisma.js';

//============imports Zod
import {
  RestrictionSchema,
  PreferenceSchema,
} from '../schemas/preferencesSchema.js';
import type {
  RestrictionPayload,
  PreferencePayload,
} from '../schemas/preferencesSchema.js';

//========== imports Redis
import {
  setPreferencesCache,
  getPreferencesCache,
  deletePreferencesCache,
  setRestrictionsCache,
  getRestrictionsCache,
  deleteRestrictionsCache,
} from './preferencesCache.js';
import type {
  PreferencesCacheData,
  RestrictionsCacheData,
} from './preferencesCache.js';

//=============================== function auxliary

function filterUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined),
  ) as Partial<T>;
}

//============================== preferencesService

export const getPreferences = async (userId: string) => {
  const cached = await getPreferencesCache(userId);
  if (cached) {
    return cached;
  }
  const record = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
  if (!record) return null;

  const data = filterUndefined(record.preferences as PreferencesCacheData);

  await setPreferencesCache(userId, data);
  return data;
};

export const updatePreferences = async (
  userId: string,
  payload: PreferencePayload,
) => {
  const parsed = PreferenceSchema.parse(payload);
  const current = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
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

export const getRestrictions = async (userId: string) => {
  const cached = await getRestrictionsCache(userId);
  if (cached) {
    return cached;
  }
  const record = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
  if (!record) return null;

  const data = filterUndefined(record.restrictions as RestrictionsCacheData);

  await setRestrictionsCache(userId, data);
  return data;
};

export const updateRestrictions = async (
  userId: string,
  payload: RestrictionPayload,
) => {
  const parsed = RestrictionSchema.parse(payload);

  const current = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });

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
