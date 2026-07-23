import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import { GoogleGenAI } from '@google/genai'; // Import the GoogleGenerativeAI class from the @google/generative-ai package

//====================== types
type PreferencesData = {
  dietType?: string;
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

//========================== generateMealPlan

export const generateMealPlan = async (userId: string) => {
  const nutritionGoal = await prisma.userNutritionGoal.findUnique({
    // Query the database for the user's nutrition goal
    where: {
      userId,
    },
  });
  if (!nutritionGoal) {
    throw new Error('Meta nutricional não encontrada');
  }

  const preferencesRecord = await prisma.userPreferences.findUnique({
    // Query the database for the user's preferences
    where: {
      userId,
    },
  });
  if (!preferencesRecord) {
    throw new Error('Preferências nao encontradas');
  }
  //  Function for get user preferences
  const preferences = (preferencesRecord.preferences as PreferencesData) || {};
  const restrictions =
    (preferencesRecord.restrictions as RestrictionsData) || {};

  // Create the payload
  const payload = {
    tdee: nutritionGoal,
    preferences,
    restrictions,
  };

  const prompt = `
  Você é um nutricionista especialista em planejamento alimentar. Sua tarefa é gerar uma dieta semanal (7 dias) para o usuário, com base nos dados fornecidos. Essa dieta será repetida por 4 semanas consecutivas (1 mês), ou seja, o cardápio de cada dia da semana se repetirá toda semana.

Dados do usuário:
- TDEE: ${payload.tdee.dailyCalorieTarget} kcal
- Proteína alvo: ${payload.tdee.proteinTarget}g
- Carboidratos alvo: ${payload.tdee.carbsTarget}g
- Gordura alvo: ${payload.tdee.fatTarget}g
- Preferências: ${JSON.stringify(payload.preferences)}
- Restrições: ${JSON.stringify(payload.restrictions)}
- Número de refeições por dia: ${payload.preferences.mealsPerDay || 4} (4, 5 ou 6)
- Unidade de medida padrão: gramas (g) para sólidos, mililitros (ml) para líquidos.

---

### 1. Distribuição das calorias e macros por refeição

- Almoço: 30%
- Jantar: 30%
- Café da manhã: 15% (ajustável para 20% se o usuário tiver fome matinal ou treinar pela manhã)
- Lanche da tarde: 15% (ajustável para 20% se o usuário treinar à tarde)
- Os 10% restantes devem ser alocados para a refeição que o usuário mais precisa (ex: pré-treino com mais carboidratos, ceia com menos carboidratos e mais proteína).
- Para 5 refeições: distribua os 40% restantes (após almoço e jantar) de forma inteligente, respeitando as regras acima.
- Para 6 refeições: distribua os 40% restantes igualmente entre as outras 4 refeições (10% cada), mas priorize a refeição que o usuário mais precisa.

A distribuição percentual se aplica igualmente a calorias, proteínas, carboidratos e gorduras.

---

### 2. Cálculo dos alimentos

- Utilize exclusivamente a tabela TACO (Tabela Brasileira de Composição de Alimentos) ou USDA como fonte de dados nutricionais.
- NUNCA invente valores nutricionais – sempre calcule com base em dados reais.
- Quantidades devem ser fornecidas em GRAMAS (g) para sólidos e MILILITROS (ml) para líquidos.
- A soma diária de calorias e macros deve bater a meta do TDEE com margem de erro ≤ 5%.

---

### 3. Substituição de alimentos (recalculo inteligente)

Quando o usuário pedir para trocar um alimento específico (ex: "troque o arroz por batata no almoço de terça"):
- A IA deve recalcular APENAS a quantidade do novo alimento para que os macros daquela refeição permaneçam os mesmos.
- Mantenha todos os outros alimentos e quantidades inalterados.
- Recalcule a quantidade do novo alimento com base na equivalência calórica e de macros do alimento removido.
- Se a substituição afetar o total diário, ajuste as quantidades da refeição substituída para que o total do dia continue batendo o TDEE.
- NÃO regenerar a dieta inteira – apenas o alimento trocado.
- A substituição deve ser aplicada àquele dia específico, e não para todas as semanas (a menos que o usuário peça para aplicar permanentemente).

---

### 4. Formato de saída (JSON)

Retorne APENAS um JSON válido (sem texto adicional). Estrutura:

{
  "monday": {
    "meals": [
      { "mealType": "cafe_da_manha", "items": [ { "name": "Pão integral", "quantity": 60, "unit": "g" } ] },
      { "mealType": "almoco", "items": [ { "name": "Arroz", "quantity": 150, "unit": "g" }, { "name": "Frango", "quantity": 120, "unit": "g" } ] },
      { "mealType": "lanche_da_tarde", "items": [ { "name": "Banana", "quantity": 100, "unit": "g" } ] },
      { "mealType": "jantar", "items": [ { "name": "Salmão", "quantity": 150, "unit": "g" } ] }
    ]
  },
  "tuesday": { ... },
  "wednesday": { ... },
  "thursday": { ... },
  "friday": { ... },
  "saturday": { ... },
  "sunday": { ... }
}

---

### 5. Restrições adicionais

- Respeite as preferências e restrições informadas.
- Varie os alimentos entre os dias para evitar monotonia.
- Inclua fontes de proteína, carboidratos complexos e gorduras saudáveis em todas as refeições principais.
- Se o usuário não informar preferências, use alimentos comuns e variados.
- A dieta gerada será cacheada por 1 mês. Portanto, o cardápio semanal será repetido por 4 semanas. Apenas substitua um alimento quando o usuário solicitar, sem regenerar a dieta inteira.

Agora, gere a dieta semanal completa com base nos dados fornecidos.`;

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não fornecida no .env');
  }
  const genAI = new GoogleGenAI({ apiKey }); // Create a new instance of the GoogleGenAI class
  const response = await genAI.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });
  // Check if the response is valid
  const rawText = response.text;
  if (!rawText) {
    throw new Error('Resposta da IA está vazia');
  }
  try {
    // Parse the JSON
    const parsed = JSON.parse(rawText);
    return parsed;
  } catch (error) {
    throw new Error('Resposta da IA não é um JSON válido', { cause: error });
  }
};
