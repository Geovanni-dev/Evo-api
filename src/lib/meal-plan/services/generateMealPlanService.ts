import prisma from '../../prisma/prisma.js';
import { deepSeek } from '../../AI-Models/client.js';
import { DAYS } from '../schemas/mealPlanSchema.js';
import { buildMealPlanSchema } from '../schemas/mealPlanSchema.js';
import {
  buildMealPlanPrompt,
  mealPlanSystemPrompt,
} from '../../prompts/mealPlanPrompt.js';
import {
  DietaForaDaMetaError,
  MetaNutricionalNaoEncontradaError,
  PreferenciasNaoEncontradasError,
  RespostaJsonInvalidaError,
  RespostaLimiteTokensError,
  RespostaVaziaError,
} from '../../../errors.js';
import { buildFinalTemplates } from './validateProposedMealPlan.js';
import { filterMealPlanFoods } from './filterMealPlanFoods.js';

//====================== types
type PreferencesData = {
  dietType?: string;
  dietRestriction?: 'none' | 'vegetarian' | 'vegan';
  dietCategory?: string;
  suplementUse?: string;
  mealsPerDay?: number;
  likedFoods?: string[];
  dislikedFoods?: string[];
  avoidFoods?: string[];
};

type RestrictionsData = {
  intolerances?: string[];
  allergies?: string[];
  healthConditions?: string[];
  observations?: string;
};

type MacroTargets = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

//============ auxiliar functions

// Accepts both the canonical key ("vegan") and the legacy label ("Vegana")
function normalizeDietRestriction(
  preferences: PreferencesData,
): 'none' | 'vegetarian' | 'vegan' {
  if (preferences.dietRestriction) return preferences.dietRestriction;

  const raw = (preferences.dietType ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  if (raw.includes('vegan')) return 'vegan';
  if (raw.includes('vegetarian')) return 'vegetarian';
  return 'none';
}

// Reshapes the macro split for health conditions, keeping total calories
function buildAdjustedTargets(
  base: MacroTargets,
  healthConditions: string[],
): { targets: MacroTargets; warnings: string[] } {
  const has = (key: string) => healthConditions.includes(key);
  const warnings: string[] = [];

  let { proteinTarget, carbsTarget } = base;
  const { dailyCalorieTarget } = base;

  if (has('ckd')) {
    const cap = (dailyCalorieTarget * 0.15) / 4;
    if (proteinTarget > cap) {
      proteinTarget = cap;
      warnings.push(
        'Sua proteína diária foi reduzida pela condição renal informada.',
      );
    }
  }

  if (has('diabetes_t2')) {
    const moderate = (dailyCalorieTarget * 0.4) / 4;
    if (carbsTarget > moderate) {
      carbsTarget = moderate;
      warnings.push(
        'Seu carboidrato diário foi moderado e distribuído entre as refeições.',
      );
    }
  }

  const fatTarget =
    (dailyCalorieTarget - proteinTarget * 4 - carbsTarget * 4) / 9;

  return {
    targets: {
      dailyCalorieTarget,
      proteinTarget: Math.round(proteinTarget),
      carbsTarget: Math.round(carbsTarget),
      fatTarget: Math.round(fatTarget),
    },
    warnings,
  };
}

const WEEKDAY_TEMPLATE_MAP: Record<string, string> = {
  monday: 'dayA',
  tuesday: 'dayB',
  wednesday: 'dayC',
  thursday: 'dayD',
  friday: 'dayA',
  saturday: 'dayB',
  sunday: 'dayC',
};

function expandTemplatesIntoWeek(template: Record<string, unknown>) {
  const week = {} as Record<string, unknown>;
  for (const day of DAYS) {
    const templateKey = WEEKDAY_TEMPLATE_MAP[day] ?? 'dayA';
    week[day] = template[templateKey];
  }
  return week;
}

//========================== generateMealPlan

export const generateMealPlan = async (userId: string) => {
  const nutritionGoal = await prisma.userNutritionGoal.findUnique({
    where: {
      userId,
    },
  });
  if (!nutritionGoal) {
    throw new MetaNutricionalNaoEncontradaError();
  }

  const preferencesRecord = await prisma.userPreferences.findUnique({
    where: {
      userId,
    },
  });
  if (!preferencesRecord) {
    throw new PreferenciasNaoEncontradasError();
  }

  const preferences = (preferencesRecord.preferences as PreferencesData) || {};
  const restrictions =
    (preferencesRecord.restrictions as RestrictionsData) || {};

  const dietRestriction = normalizeDietRestriction(preferences);
  const healthConditions = restrictions.healthConditions ?? [];

  // Kidney disease lowers protein while the fit routine raises it warn instead of silently picking a side
  const conflictWarnings =
    healthConditions.includes('ckd') && preferences.dietCategory === 'fit'
      ? [
          'Você marcou condição renal e rotina fitness. Mantivemos a proteína limitada por segurança.',
        ]
      : [];

  const { targets, warnings: adjustWarnings } = buildAdjustedTargets(
    {
      dailyCalorieTarget: nutritionGoal.dailyCalorieTarget,
      proteinTarget: nutritionGoal.proteinTarget,
      carbsTarget: nutritionGoal.carbsTarget,
      fatTarget: nutritionGoal.fatTarget,
    },
    healthConditions,
  );
  const warnings = [...adjustWarnings, ...conflictWarnings];

  if (
    (restrictions.allergies?.length ?? 0) > 0 ||
    (restrictions.intolerances?.length ?? 0) > 0
  ) {
    warnings.push(
      'Confira os ingredientes e avisos de alérgenos nos rótulos antes de consumir alimentos industrializados.',
    );
  }

  const availableFoods = await prisma.foodReference.findMany({
    where: {
      ...(dietRestriction === 'vegan' && { isVegan: true }),
      ...(dietRestriction === 'vegetarian' && { isVegetarian: true }),
    },
  });
  const foodReference = filterMealPlanFoods(
    availableFoods,
    preferences,
    restrictions,
  );

  const payload = {
    tdee: targets,
    preferences,
    restrictions,
    foodReference,
  };

  const prompt = buildMealPlanPrompt(
    payload,
    healthConditions,
    dietRestriction,
  );

  const response = await deepSeek.chat.completions.create({
    model: 'deepseek-flash',
    reasoning_effort: 'none',
    stream: false,
    response_format: {
      type: 'json_object',
    },
    max_tokens: 8_000,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: mealPlanSystemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  if (response.choices[0]?.finish_reason === 'length') {
    throw new RespostaLimiteTokensError();
  }

  const rawText = response.choices[0]?.message.content;
  if (!rawText) {
    throw new RespostaVaziaError();
  }

  let parsed;

  function stripJsonFence(text: string): string {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    return match?.[1] ?? text.trim();
  }
  try {
    parsed = JSON.parse(stripJsonFence(rawText));
  } catch (error) {
    throw new RespostaJsonInvalidaError(error);
  }
  const templates = buildFinalTemplates(
    parsed,
    foodReference,
    targets,
    preferences,
  );
  const week = expandTemplatesIntoWeek(templates);
  // validate against the adjusted targets, not the original ones
  const schema = buildMealPlanSchema(targets);
  const result = schema.safeParse(week);

  if (!result.success) {
    console.error(
      JSON.stringify(
        {
          targets,
          issues: result.error.issues,
        },
        null,
        2,
      ),
    );

    throw new DietaForaDaMetaError(result.error.issues);
  }

  return { plan: result.data, targets, warnings };
};
