import { GoogleGenAI } from '@google/genai';

import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js';

//=================types
type Context = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  meals: {
    id: string;
    mealType: string;
    items: {
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  }[];
  mealPlan: {
    monday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
    tuesday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
    wednesday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
    thursday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
    friday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
    saturday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
    sunday: {
      meals: {
        mealType: string;
        items: {
          name: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }[];
      }[];
    };
  } | null;
  todayKey: string;
  remaining: { calories: number; protein: number; carbs: number; fat: number };
} | null;

//=============================chatWithAI function

export const chatWithAI = async (params: {
  messages: string;
  context: Context;
  history: { role: string; text: string }[];
}) => {
  const contextText = params.context
    ? `Estado nutricional atual:
       - TDEE: ${params.context.tdee?.calories || 'não definido'} kcal
       - Consumido hoje: ${params.context.calories || 0} kcal
       - Restante: ${params.context.remaining?.calories || 0} kcal
       - Proteína: ${params.context.protein || 0}g (meta: ${params.context.tdee?.protein || 0}g)
       - Carboidratos: ${params.context.carbs || 0}g (meta: ${params.context.tdee?.carbs || 0}g)
       - Gordura: ${params.context.fat || 0}g (meta: ${params.context.tdee?.fat || 0}g)`
    : 'Ainda não há dados nutricionais para hoje.';

  const mealsText =
    params.context?.meals && params.context.meals.length > 0
      ? params.context.meals
          .map((meal) => {
            const itemsList = meal.items
              .map((item) => `${item.name} (${item.calories}kcal)`)
              .join(', ');
            return `[id: ${meal.id}] ${meal.mealType}: ${itemsList}`;
          })
          .join('\n')
      : 'Nenhuma refeição registrada hoje.';

  const planMealsText = params.context?.mealPlan
    ? Object.entries(params.context.mealPlan)
        .map(([dayKey, dayData]) => {
          const dayMealText = dayData.meals
            .map((meal) => {
              const itemsList = meal.items
                .map((item) => `${item.name} (${item.calories}kcal)`)
                .join(', ');
              return `${meal.mealType}: ${itemsList}`;
            })
            .join(' | ');
          return `${dayKey}: ${dayMealText}`;
        })
        .join('\n')
    : 'Nenhuma dieta ativa.';

  const historyText = params.history
    .slice(-6)
    .filter((msg) => msg.role !== 'system')
    .map((msg) => `${msg.role === 'user' ? 'Usuário' : 'AI'}: ${msg.text}`)
    .join('\n');
  const fullPrompt = `
     Prompt:
    ${SYSTEM_PROMPT}

    Contexto nutricional:
    ${contextText}

    Refeições de hoje:
    ${mealsText}

    Dieta ativa:
    ${planMealsText}

    Hoje é: ${params.context?.todayKey || 'não informado'}

    Histórico da conversa resumido:
    ${historyText || 'Nenhuma mensagem anterior'}

    Usuário: ${params.messages}
    AI:`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não fornecida no .env');
  }
  const genAI = new GoogleGenAI({ apiKey });
  const response = await genAI.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: fullPrompt,
  });
  return response.text;
};
