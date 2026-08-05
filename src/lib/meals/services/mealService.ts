import prisma from '../../prisma/prisma.js';
import type {
  CreateMealPayload,
  UpdateMealPayload,
  DateSchemaType,
} from '../schemas/mealSchemas.js';
import { setDailyCache, getDailyCache, deleteDailyCache } from './mealCache.js';
import type { MealItem } from '../services/mealCache.js';

//==================== types

type MacroItem = Pick<MealItem, 'calories' | 'protein' | 'carbs' | 'fat'>;

//=========================== auxiliary function

const somaMacros = (items: MacroItem[]) => {
  const totais = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return totais;
};

//============================== mealService

export const createMeal = async (
  payload: CreateMealPayload,
  userId: string,
) => {
  const totais = somaMacros(payload.items);

  const serverNow = new Date();
  const userLocalDate = payload.localDate
    ? (() => {
        const [year, month, day] = payload.localDate.split('-').map(Number) as [
          number,
          number,
          number,
        ];
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      })()
    : (() => {
        const d = new Date(serverNow);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();

  const serverToday = new Date(serverNow);
  serverToday.setUTCHours(0, 0, 0, 0);

  const diffTime = userLocalDate.getTime() - serverToday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // meal date must be within -2 to +1 days of the server date
  if (diffDays < -2 || diffDays > 1) {
    throw new Error(
      'Data da refeição inválida. Fora da janela permitida (-2 a +1 dias).',
    );
  }

  return await prisma.$transaction(
    async (tx) => {
      const tdee = await tx.userNutritionGoal.findUnique({
        where: {
          userId,
        },
      });
      if (!tdee) {
        throw new Error('TDEE não encontrado');
      }
      const meal = await tx.meal.create({
        data: {
          userId,
          mealType: payload.mealType || 'refeicao_livre',
          aiRawResponse: payload.aiRawResponse || {},
          createdAt: serverNow,
          date: userLocalDate,
        },
        include: { items: true },
      });
      await tx.mealItem.createMany({
        data: payload.items.map((item) => ({
          ...item,
          mealId: meal.id,
        })),
      });
      await tx.dailySummary.upsert({
        where: {
          userId_date: {
            userId,
            date: userLocalDate,
          },
        },
        update: {
          calories: { increment: totais.calories },
          protein: { increment: totais.protein },
          carbs: { increment: totais.carbs },
          fat: { increment: totais.fat },
        },
        create: {
          userId,
          date: userLocalDate,
          ...totais,
        },
      });
      try {
        await deleteDailyCache(userId, userLocalDate);
      } catch (error) {
        console.error('Erro ao deletar o cache:', error);
      }
      return meal;
    },
    { timeout: 10000 },
  );
};

export const getDailyMeals = async (userId: string, dateParams?: string) => {
  const serverNow = new Date();
  const date = dateParams
    ? (() => {
        const [year, month, day] = dateParams.split('-').map(Number) as [
          number,
          number,
          number,
        ];
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      })()
    : (() => {
        const d = new Date(serverNow);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();

  const cached = await getDailyCache(userId, date);
  if (cached) {
    return cached;
  }
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      date,
    },
    include: { items: true },
  });

  const dailySummary = await prisma.dailySummary.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  });
  const nutritionGoal = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });
  const remaining = nutritionGoal
    ? {
        calories:
          nutritionGoal.dailyCalorieTarget - (dailySummary?.calories || 0),
        protein: nutritionGoal.proteinTarget - (dailySummary?.protein || 0),
        carbs: nutritionGoal.carbsTarget - (dailySummary?.carbs || 0),
        fat: nutritionGoal.fatTarget - (dailySummary?.fat || 0),
      }
    : null;

  const mealsSummary = meals.map((meal) => ({
    mealId: meal.id,
    mealType: meal.mealType,
    calories: meal.items.reduce((acc, item) => acc + item.calories, 0),
  }));
  const result = {
    meals,
    mealsSummary,
    totals: dailySummary || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    tdee: nutritionGoal
      ? {
          calories: nutritionGoal.dailyCalorieTarget,
          protein: nutritionGoal.proteinTarget,
          carbs: nutritionGoal.carbsTarget,
          fat: nutritionGoal.fatTarget,
        }
      : null,
    remaining,
  };

  await setDailyCache(userId, date, result);

  return result;
};

export const getMealByType = async (
  mealType: string,
  userId: string,
  dateParams?: string,
) => {
  const serverNow = new Date();
  const date = dateParams
    ? (() => {
        const [year, month, day] = dateParams.split('-').map(Number) as [
          number,
          number,
          number,
        ];
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      })()
    : (() => {
        const d = new Date(serverNow);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();
  const cached = await getDailyCache(userId, date);
  if (cached) {
    const mealFound = cached.meals.find((m) => m.mealType === mealType);
    if (!mealFound) {
      throw new Error('Refeição não encontrada');
    }
    const total = somaMacros(mealFound.items);

    return {
      meal: mealFound,
      total,
    };
  }

  const meal = await prisma.meal.findFirst({
    where: {
      mealType,
      userId,
      date,
    },
    include: { items: true },
  });

  if (!meal) {
    throw new Error('Refeição não encontrada');
  }
  const total = somaMacros(meal.items);

  return {
    meal,
    total,
  };
};

export const updateMeal = async (
  mealId: string,
  userId: string,
  payload: UpdateMealPayload,
) => {
  const { updatedMeal, newTotal, date } = await prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Meal" WHERE id = ${mealId} AND "userId" = ${userId} FOR UPDATE
  `;
      if (locked.length === 0) {
        throw new Error('Refeição não encontrada');
      }

      const meal = await tx.meal.findFirst({
        where: {
          id: mealId,
          userId,
        },
        include: { items: true },
      });

      if (!meal) {
        throw new Error('Refeição não encontrada');
      }
      const oldTotal = somaMacros(meal.items);
      const newTotal = somaMacros(payload.items);
      const difference = {
        calories: newTotal.calories - oldTotal.calories,
        protein: newTotal.protein - oldTotal.protein,
        carbs: newTotal.carbs - oldTotal.carbs,
        fat: newTotal.fat - oldTotal.fat,
      };

      const date = meal.date;

      await tx.meal.update({
        where: { id: mealId },
        data: {
          mealType: payload.mealType || meal.mealType,
        },
      });
      await tx.mealItem.deleteMany({
        where: {
          mealId,
        },
      });

      await tx.mealItem.createMany({
        data: payload.items.map((item) => ({
          ...item,
          mealId,
        })),
      });

      await tx.dailySummary.update({
        where: { userId_date: { userId, date } },
        data: {
          calories: { increment: difference.calories },
          protein: { increment: difference.protein },
          carbs: { increment: difference.carbs },
          fat: { increment: difference.fat },
        },
      });

      const updatedMeal = await tx.meal.findFirst({
        where: {
          id: mealId,
          userId,
        },
        include: { items: true },
      });

      return { updatedMeal, newTotal, date };
    },
    { timeout: 10000 },
  );

  try {
    await deleteDailyCache(userId, date);
  } catch (error) {
    console.error('Erro ao deletar o cache:', error);
  }
  return {
    meal: updatedMeal,
    total: newTotal,
  };
};

export const deleteMeal = async (mealId: string, userId: string) => {
  const meal = await prisma.meal.findFirst({
    where: {
      id: mealId,
      userId,
    },
    include: { items: true },
  });
  if (!meal) {
    throw new Error('Refeição não encontrada');
  }

  const total = somaMacros(meal.items);

  const date = meal.date;

  await prisma.$transaction(
    async (tx) => {
      await tx.mealItem.deleteMany({
        where: {
          mealId,
        },
      });
      await tx.meal.delete({
        where: {
          id: mealId,
        },
      });
      await tx.dailySummary.update({
        where: { userId_date: { userId, date } },
        data: {
          calories: { decrement: total.calories },
          protein: { decrement: total.protein },
          carbs: { decrement: total.carbs },
          fat: { decrement: total.fat },
        },
      });
    },
    { timeout: 10000 },
  );

  try {
    await deleteDailyCache(userId, date);
  } catch (error) {
    console.error('Erro ao deletar o cache:', error);
  }
  return { message: 'Refeição deletada com sucesso', total };
};

export const deleteItem = async (
  mealId: string,
  itemId: string,
  userId: string,
) => {
  const item = await prisma.mealItem.findFirst({
    where: {
      id: itemId,
      mealId,
      meal: {
        userId,
      },
    },
    include: {
      meal: true,
    },
  });
  if (!item) {
    throw new Error('Item não encontrado');
  }

  const itemTotal = {
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
  };

  const date = item.meal.date;

  await prisma.$transaction(
    async (tx) => {
      await tx.mealItem.delete({
        where: {
          id: itemId,
        },
      });
      await tx.dailySummary.update({
        where: { userId_date: { userId, date } },
        data: {
          calories: { decrement: itemTotal.calories },
          protein: { decrement: itemTotal.protein },
          carbs: { decrement: itemTotal.carbs },
          fat: { decrement: itemTotal.fat },
        },
      });
    },
    { timeout: 10000 },
  );

  try {
    await deleteDailyCache(userId, date);
  } catch (error) {
    console.error('Erro ao deletar o cache:', error);
  }
  return { message: 'Item deletado com sucesso', item };
};

export const getMealSummary = async (userId: string, date: DateSchemaType) => {
  const { from, to } = date;
  const summary = await prisma.meal.findMany({
    where: {
      userId,
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: { items: true },
  });
  const grouped: Record<
    string,
    { mealId: string; mealType: string; calories: number }[]
  > = {};
  for (const meal of summary) {
    const key = meal.date.toISOString().slice(0, 10);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({
      mealId: meal.id,
      mealType: meal.mealType,
      calories: meal.items.reduce((acc, item) => acc + item.calories, 0),
    });
  }
  return grouped;
};
