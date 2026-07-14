import { GoogleGenerativeAI } from '@google/generative-ai'; // Import the GoogleGenerativeAI class from the @google/generative-ai package

import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js'; // Import the SYSTEM_PROMPT constant

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

  remaining: { calories: number; protein: number; carbs: number; fat: number };
} | null;

//=============================chatWithAI function

export const chatWithAI = async (params: {
  messages: string;
  context: Context;
  history: { role: string; text: string }[];
}) => {
  // Define to display the context
  const contextText = params.context
    ? `Estado nutricional atual:
       - TDEE: ${params.context.tdee?.calories || 'não definido'} kcal
       - Consumido hoje: ${params.context.calories || 0} kcal
       - Restante: ${params.context.remaining?.calories || 0} kcal
       - Proteína: ${params.context.protein || 0}g (meta: ${params.context.tdee?.protein || 0}g)
       - Carboidratos: ${params.context.carbs || 0}g (meta: ${params.context.tdee?.carbs || 0}g)
       - Gordura: ${params.context.fat || 0}g (meta: ${params.context.tdee?.fat || 0}g)`
    : 'Ainda não há dados nutricionais para hoje.';
  // function to display the meals
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
  // function to display the history
  const historyText = params.history
    .slice(-6) // Get the last 6 messages in the history
    .filter((msg) => msg.role !== 'system') // Filter out system messages
    .map((msg) => `${msg.role === 'user' ? 'Usuário' : 'AI'}: ${msg.text}`)
    .join('\n');
  const fullPrompt = `
     Prompt:
    ${SYSTEM_PROMPT}

    Contexto nutricional:
    ${contextText}

    Refeições de hoje:
    ${mealsText}

    Histórico da conversa resumido:
    ${historyText || 'Nenhuma mensagem anterior'}

    Usuário: ${params.messages}
    AI:`;

  // define the API key
  const apiKey = process.env.GEMINI_API_KEY; // Get the API key from environment variables
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não fornecida no .env');
  }
  const genAI = new GoogleGenerativeAI(apiKey); // Create a new instance of the GoogleGenerativeAI class
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' }); // Get the "gemini-1.5-flash" model

  const result = await model.generateContent(fullPrompt); // Generate content
  const response = result.response.text();
  return response; // Return the generated response
};
