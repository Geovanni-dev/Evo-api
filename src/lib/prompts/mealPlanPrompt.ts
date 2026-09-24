type MealPlanPromptPayload = {
  tdee: {
    dailyCalorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
  };
  preferences: {
    dietCategory?: string;
    suplementUse?: string;
    mealsPerDay?: number;
  };
  restrictions: unknown;
  foodReference: {
    id: string;
    name: string;
    category: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }[];
};

function buildHealthGuidance(
  healthConditions: string[],
  restriction: 'none' | 'vegetarian' | 'vegan',
): string {
  const has = (key: string) => healthConditions.includes(key);
  const rules: string[] = [];

  if (has('diabetes_t2')) {
    rules.push(
      '- Diabetes: distribua o carboidrato entre TODAS as refeições, sem concentrar em uma só. Prefira fontes integrais e leguminosas; evite concentrar açúcar de fruta numa refeição isolada.',
    );
  }
  if (has('ckd')) {
    rules.push(
      '- Doença renal: selecione fontes de proteína de alto valor biológico sem acumular várias fontes proteicas na mesma refeição. O backend definirá as porções conforme a meta ajustada.',
    );
  }
  if (has('hypertension')) {
    rules.push(
      '- Hipertensão: evite queijos curados, alimentos em conserva e outras opções ricas em sódio. Priorize alimentos naturalmente pouco processados.',
    );
  }
  if (has('high_cholesterol')) {
    rules.push(
      '- Colesterol alto: prefira carnes magras (patinho, músculo, peito de frango) e peixes; evite queijos gordurosos e cortes com muita gordura. Inclua aveia e leguminosas pela fibra solúvel.',
    );
  }
  if (restriction === 'vegan') {
    rules.push(
      '- Dieta vegana: use somente alimentos marcados como veganos na lista e não inclua ingredientes de origem animal.',
    );
  }

  return rules.length > 0
    ? `\n### 7. Regras por condição de saúde informada\n\n${rules.join('\n')}\n`
    : '';
}

export const mealPlanSystemPrompt =
  'Você seleciona alimentos para cardápios estruturados. Não calcule porções nem valores nutricionais. Responda exclusivamente com um objeto JSON válido, sem Markdown e sem texto adicional.';

export function buildMealPlanPrompt(
  payload: MealPlanPromptPayload,
  healthConditions: string[],
  dietRestriction: 'none' | 'vegetarian' | 'vegan',
): string {
  const foodReferenceText = payload.foodReference
    .map(
      (f) =>
        `${f.id} | ${f.name} (${f.category}): ${f.caloriesPer100g}kcal, P:${f.proteinPer100g}g, C:${f.carbsPer100g}g, G:${f.fatPer100g}g por 100g`,
    )
    .join('\n');

  return `
  Sua tarefa é selecionar os alimentos de 4 modelos de dia (dayA, dayB, dayC, dayD) para o usuário. O backend definirá as porções, calculará os nutrientes e distribuirá os modelos pelos 7 dias da semana, repetidos por 4 semanas (1 mês).

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

---

### 1. Composição dos modelos de dia

- Cada modelo deve conter EXATAMENTE ${payload.preferences.mealsPerDay || 4} refeições.
- Use as metas calóricas e de macronutrientes para orientar a ESCOLHA dos alimentos, sem fazer cálculos ou definir porções.
- Inclua fontes de proteína nas refeições principais e combine-as com fontes apropriadas de carboidratos, vegetais e gorduras. Não monte almoço ou jantar apenas com fontes de carboidrato.
- Distribua os tipos de alimento de forma coerente ao longo do dia, considerando que o backend ajustará as quantidades para atender às metas.

---

### 2. Alimentos disponíveis

- Utilize EXCLUSIVAMENTE os alimentos da lista abaixo. Copie o ID exatamente como apresentado; não invente alimentos nem IDs. Os valores por 100g servem apenas para orientar a seleção, não devem aparecer na resposta:

${foodReferenceText}

- Não defina quantidades, unidades, calorias ou macronutrientes de nenhum item. Essa responsabilidade é do backend.

---

### 3. Formato de saída (JSON)

Retorne APENAS um objeto JSON válido, sem Markdown, comentários ou texto adicional.
- O objeto raiz deve conter exatamente as chaves "dayA", "dayB", "dayC" e "dayD".
- Cada dia deve conter somente a propriedade "meals", que é uma lista de refeições.
- Cada refeição deve conter somente "mealType" e "items".
- Cada item deve conter somente "foodId", com o UUID de um alimento da lista.
- "mealType" deve ser um destes valores: "cafe_da_manha", "lanche_da_manha", "almoco", "lanche_da_tarde", "pre_treino", "pos_treino", "jantar" ou "ceia".
- Não inclua nomes, quantidades, unidades, valores nutricionais, totais diários, explicações ou outras propriedades no JSON.

---

### 4. Restrições adicionais

- Respeite as preferências e restrições informadas.
- Varie os alimentos entre os modelos de dia para evitar monotonia.
- Evite usar a mesma fruta, laticínio ou fonte de gordura que não seja óleo mais de duas vezes no mesmo modelo de dia.
- Varie as combinações de alimentos das refeições entre dayA, dayB, dayC e dayD, especialmente quando tiverem o mesmo mealType.
- Procure distribuir cada fruta, laticínio e fonte de gordura que não seja óleo em até três dos quatro modelos de dia. Essa orientação não se aplica a azeite e óleos.
- Inclua fontes de proteína, carboidratos complexos e gorduras saudáveis nas refeições principais.
- Se o usuário não informar preferências, use alimentos comuns e variados.
- Cada modelo de dia gerado será repetido por várias semanas.

---

### 5. Regras de composição por perfil e tipo de alimento

- Inclua vegetais e folhas quando forem adequados à refeição; não estime suas porções.
- Se a categoria da dieta for "fit": prefira "pre_treino" e "pos_treino" no lugar de lanches, sem aumentar o número de refeições. Inclua ambos quando couberem no total de refeições informado.
- "pre_treino" e "pos_treino" não têm horário fixo: são consumidas antes e depois do treino, no horário em que o usuário treinar.
- Se a categoria da dieta for "normal": não inclua "pre_treino" nem "pos_treino"; escolha os lanches que couberem no total de refeições informado.
- Suplementos (whey, hipercalórico, albumina, barra de proteína) só podem aparecer se o uso de suplementos estiver informado. Caso contrário, use fonte de proteína real da mesma categoria.
- No máximo DUAS leguminosas diferentes (feijões, lentilha, ervilha, tremoço) por dia, para evitar volume e fibra excessivos.
${buildHealthGuidance(healthConditions, dietRestriction)}

Agora, selecione os alimentos dos 4 modelos de dia (dayA, dayB, dayC, dayD) no formato JSON solicitado.`;
}
