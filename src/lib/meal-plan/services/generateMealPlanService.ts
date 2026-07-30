import prisma from '../../prisma/prisma.js'; // Import the PrismaClient instance from the prisma.ts file
import { GoogleGenAI } from '@google/genai'; // Import the GoogleGenerativeAI class from the @google/generative-ai package
import { DAYS } from '../schemas/mealPlanSchema.js'; // Import the DAYS constant from the mealPlanSchema.js file
import { buildMealPlanSchema } from '../schemas/mealPlanSchema.js';

//====================== types
type PreferencesData = {
  dietType?: string;
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

//============ auxiliar functions

// Mapping of days of the week to template keys
const WEEKDAY_TEMPLATE_MAP: Record<string, string> = {
  monday: 'dayA',
  tuesday: 'dayB',
  wednesday: 'dayC',
  thursday: 'dayD',
  friday: 'dayA',
  saturday: 'dayB',
  sunday: 'dayC',
};

// function for expandTemplatesIntoWeek
function expandTemplatesIntoWeek(template: Record<string, unknown>) {
  const week = {} as Record<string, unknown>;
  for (const day of DAYS) {
    const templateKey = WEEKDAY_TEMPLATE_MAP[day] ?? 'dayA'; // Get the template key for the current day

    week[day] = template[templateKey]; // Add the expanded day to the week
  }
  return week;
}

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

  const foodReference = await prisma.foodReference.findMany({
    where: {
      ...(preferences.dietType === 'vegan' && { isVegan: true }),
      ...(preferences.dietType === 'vegetarian' && { isVegetarian: true }),
    },
  });

  // Create the payload
  const payload = {
    tdee: nutritionGoal,
    preferences,
    restrictions,
    foodReference,
  };

  const foodReferenceText = payload.foodReference
    .map(
      (f) =>
        `${f.name} (${f.category}): ${f.caloriesPer100g}kcal, P:${f.proteinPer100g}g, C:${f.carbsPer100g}g, G:${f.fatPer100g}g por 100g`,
    )
    .join('\n');

  const prompt = `
  Você é um nutricionista especialista em planejamento alimentar. Sua tarefa é gerar 4 modelos de dia (dayA, dayB, dayC, dayD) para o usuário, com base nos dados fornecidos. Esses modelos serão distribuídos pelos 7 dias da semana pelo backend, e repetidos por 4 semanas (1 mês).

Dados do usuário:
- TDEE: ${payload.tdee.dailyCalorieTarget} kcal
- Proteína alvo: ${payload.tdee.proteinTarget}g
- Carboidratos alvo: ${payload.tdee.carbsTarget}g
- Gordura alvo: ${payload.tdee.fatTarget}g
- Preferências: ${JSON.stringify(payload.preferences)}
- Restrições: ${JSON.stringify(payload.restrictions)}
- Categoria da dieta: ${payload.preferences.dietCategory || 'normal'}
- Uso de suplementos: ${payload.preferences.suplementUse || 'não informado'}
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

- Utilize EXCLUSIVAMENTE os alimentos da lista abaixo (já extraídos da TACO/TBCA, com valores reais). NÃO use alimentos fora dessa lista e NÃO invente valores nutricionais:

${foodReferenceText}

- Cada item retornado deve incluir também "calories", "protein", "carbs" e "fat" (valores já calculados para a quantidade daquele item, não por 100g).
- Quantidades devem ser fornecidas em GRAMAS (g) para sólidos e MILILITROS (ml) para líquidos.
- A soma diária de calorias e macros de cada modelo de dia deve bater a meta do TDEE com margem de erro ≤ 5%.

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

Retorne APENAS um JSON válido (sem texto adicional), com os 4 modelos de dia. Estrutura:

{
  "dayA": {
    "meals": [
      { "mealType": "cafe_da_manha", "items": [ { "name": "Pão integral", "quantity": 60, "unit": "g", "calories": 152, "protein": 5.6, "carbs": 30, "fat": 2.2 } ] },
      { "mealType": "almoco", "items": [ { "name": "Arroz branco cozido", "quantity": 150, "unit": "g", "calories": 192, "protein": 3.8, "carbs": 42.2, "fat": 0.3 }, { "name": "Peito de frango grelhado", "quantity": 120, "unit": "g", "calories": 191, "protein": 38.4, "carbs": 0, "fat": 3 } ] },
      { "mealType": "lanche_da_tarde", "items": [ { "name": "Banana prata", "quantity": 100, "unit": "g", "calories": 98, "protein": 1.3, "carbs": 26, "fat": 0.1 } ] },
      { "mealType": "jantar", "items": [ { "name": "Tilápia filé grelhado", "quantity": 150, "unit": "g", "calories": 144, "protein": 30.2, "carbs": 0, "fat": 2.6 } ] }
    ]
  },
  "dayB": { ... },
  "dayC": { ... },
  "dayD": { ... }
}

---

### 5. Restrições adicionais

- Respeite as preferências e restrições informadas.
- Varie os alimentos entre os modelos de dia para evitar monotonia.
- Inclua fontes de proteína, carboidratos complexos e gorduras saudáveis em todas as refeições principais.
- Se o usuário não informar preferências, use alimentos comuns e variados.
- Cada modelo de dia gerado será repetido por várias semanas. Apenas substitua um alimento quando o usuário solicitar, sem regenerar os modelos inteiros.

---

### 6. Regras de composição por perfil e tipo de alimento

- Alimentos de folha/salada crus (alface, tomate, pepino, repolho) são sempre "à vontade", sem gramatura fixa.
- Vegetais cozidos (cenoura, brócolis, abobrinha, couve, beterraba) continuam com porção em gramas normalmente.
- Se a categoria da dieta for "fit": inclua SEMPRE as refeições "pre_treino" e "pos_treino" em TODOS os 4 modelos de dia.
- Se a categoria da dieta for "normal": não inclua "pre_treino" nem "pos_treino".
- Suplementos (whey, hipercalórico, albumina, barra de proteína) só podem aparecer se o uso de suplementos estiver informado. Caso contrário, use fonte de proteína real da mesma categoria.

Agora, gere os 4 modelos de dia (dayA, dayB, dayC, dayD) com base nos dados fornecidos.`;

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

  let parsed; // Variable to store the parsed JSON

  // Try to parse the response as JSON
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error('Resposta da IA não é um JSON válido', { cause: error });
  }
  // Check if the parsed JSON is valid
  const week = expandTemplatesIntoWeek(parsed);
  const schema = buildMealPlanSchema(nutritionGoal); // Check if the week is valid
  const result = schema.safeParse(week);

  if (!result.success) {
    throw new Error('Dieta gerada não bate com o TDEE', {
      cause: result.error.issues,
    }); // Throw an error
  }

  return result.data;
};
