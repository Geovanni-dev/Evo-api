import { GoogleGenerativeAI } from '@google/generative-ai'; // Import the GoogleGenerativeAI class from the @google/generative-ai package

import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js'; // Import the SYSTEM_PROMPT constant

//=================types
type Context = {
  tdee: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  remaining: { calories: number; protein: number; carbs: number; fat: number };
} | null;

//=============================chatWithAI function

export const chatWithAI = async (params: {
  messages: string;
  context: Context;
  history: { role: string; text: string }[];
}) => {
  // Define the full prompt
  const contextText = params.context
    ? `Estado nutricional atual:
       - TDEE: ${params.context.tdee?.calories || 'não definido'} kcal
       - Consumido hoje: ${params.context.consumed?.calories || 0} kcal
       - Restante: ${params.context.remaining?.calories || 0} kcal
       - Proteína: ${params.context.consumed?.protein || 0}g (meta: ${params.context.tdee?.protein || 0}g)
       - Carboidratos: ${params.context.consumed?.carbs || 0}g (meta: ${params.context.tdee?.carbs || 0}g)
       - Gordura: ${params.context.consumed?.fat || 0}g (meta: ${params.context.tdee?.fat || 0}g)`
    : 'Ainda não há dados nutricionais para hoje.';
  const historyText = params.history
    .slice(-6) // Get the last 6 messages in the history
    .map((msg) => `${msg.role === 'user' ? 'Usuário' : 'AI'}: ${msg.text}`)
    .join('\n');

  const fullPrompt = `
    ${SYSTEM_PROMPT}

    ${contextText}

    Histórico da conversa (resumido):
    ${historyText || 'Nenhuma mensagem anterior'}

    Usuário: ${params.messages}
    AI:`;

  // define the API key
  const apiKey = process.env.GEMINI_API_KEY; // Get the API key from environment variables
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não fornecida no .env');
  }
  const genAI = new GoogleGenerativeAI(apiKey); // Create a new instance of the GoogleGenerativeAI class
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' }); // Get the "gemini-1.5-flash" model

  const result = await model.generateContent(fullPrompt); // Generate content
  const response = result.response.text();
  return response; // Return the generated response
};
