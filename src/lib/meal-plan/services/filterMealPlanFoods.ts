import type { FoodReference } from '@prisma/client';
import {
  AlimentosInsuficientesError,
  RestricaoAlimentarNaoSuportadaError,
} from '../../../errors.js';

type Preferences = {
  dislikedFoods?: string[];
  avoidFoods?: string[];
};

type Restrictions = {
  allergies?: string[];
  intolerances?: string[];
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const groupPatterns = {
  peixe: /\b(peixe|tilapia|merluza|cacao|atum|sardinha)\b/,
  'frutos do mar':
    /\b(peixe|tilapia|merluza|cacao|atum|sardinha|camarao|marisco|lula|polvo|ostra|crustaceo)\b/,
  'carne de porco': /\b(porco|suino|lombo)\b/,
  queijo: /\b(queijo|ricota|requeijao)\b/,
  ovo: /\b(ovo|albumina)\b/,
  castanhas:
    /\b(castanha|castanhas|noz|nozes|amendoa|avel[aã]|pistache|macadamia)\b/,
} as const;

const restrictionPatterns: Record<
  string,
  (food: FoodReference, name: string) => boolean
> = {
  peanut_allergy: (_food, name) => /\bamendoim\b/.test(name),
  seafood_allergy: (_food, name) => groupPatterns['frutos do mar'].test(name),
  tree_nut_allergy: (_food, name) => groupPatterns.castanhas.test(name),
  egg_allergy: (_food, name) => groupPatterns.ovo.test(name),
  lactose_intolerance: (food, name) =>
    food.category === 'dairy' ||
    /\b(whey|leite|iogurte|queijo|ricota|requeijao|hipercalorico|barra de proteina)\b/.test(
      name,
    ),
  gluten_intolerance: (_food, name) =>
    /\b(pao|macarrao|aveia|trigo|cevada|centeio|granola|barra de proteina|hipercalorico)\b/.test(
      name,
    ),
  fructose_intolerance: (food, name) =>
    food.category === 'fruit' ||
    /\b(mel|frutose|hipercalorico|barra de proteina)\b/.test(name),
};

function matchesDislike(foodName: string, preference: string) {
  const name = normalize(foodName);
  const term = normalize(preference);
  const pattern = groupPatterns[term as keyof typeof groupPatterns];

  return name.includes(term) || (pattern?.test(name) ?? false);
}

export function filterMealPlanFoods(
  foods: FoodReference[],
  preferences: Preferences,
  restrictions: Restrictions,
) {
  const disliked = [
    ...(preferences.dislikedFoods ?? []),
    ...(preferences.avoidFoods ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  const restrictionKeys = [
    ...(restrictions.allergies ?? []),
    ...(restrictions.intolerances ?? []),
  ];

  const matchers = restrictionKeys.map((key) => {
    const matcher = restrictionPatterns[key];
    if (!matcher) {
      throw new RestricaoAlimentarNaoSuportadaError(key);
    }
    return matcher;
  });

  const allowed = foods.filter((food) => {
    const name = normalize(food.name);

    return (
      !(matchers.length > 0 && food.category === 'supplement') &&
      !disliked.some((preference) => matchesDislike(food.name, preference)) &&
      !matchers.some((matcher) => matcher(food, name))
    );
  });

  if (
    !allowed.some((food) => food.category === 'protein') ||
    !allowed.some((food) => food.category === 'carb')
  ) {
    throw new AlimentosInsuficientesError();
  }

  return allowed;
}
