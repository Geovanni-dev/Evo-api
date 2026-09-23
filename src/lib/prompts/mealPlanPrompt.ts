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
      '- Doença renal: use a proteína de forma econômica e priorize fontes de alto valor biológico. Não ultrapasse a meta de proteína informada em nenhum dia.',
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
  'Você gera planos alimentares estruturados. Responda exclusivamente com um objeto JSON válido, sem Markdown e sem texto adicional.';

export function buildMealPlanPrompt(
  payload: MealPlanPromptPayload,
  healthConditions: string[],
  dietRestriction: 'none' | 'vegetarian' | 'vegan',
): string {
  const foodReferenceText = payload.foodReference
    .map(
      (f) =>
        `${f.name} (${f.category}): ${f.caloriesPer100g}kcal, P:${f.proteinPer100g}g, C:${f.carbsPer100g}g, G:${f.fatPer100g}g por 100g`,
    )
    .join('\n');

  return `
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

- Cada modelo deve conter EXATAMENTE ${payload.preferences.mealsPerDay || 4} refeições.
- Almoço e jantar devem concentrar aproximadamente 30% das calorias cada.
- Distribua os 40% restantes entre as demais refeições, garantindo que a soma final do dia alcance 100% da meta.
- Use essa distribuição como orientação, mas ajuste as quantidades para fechar simultaneamente calorias, proteínas, carboidratos e gorduras dentro das margens exigidas.

---

### 2. Cálculo dos alimentos

- Utilize EXCLUSIVAMENTE os alimentos da lista abaixo (já extraídos da TACO/TBCA, com valores reais). NÃO use alimentos fora dessa lista e NÃO invente valores nutricionais:

${foodReferenceText}

- Cada item retornado deve incluir também "calories", "protein", "carbs" e "fat" (valores já calculados para a quantidade daquele item, não por 100g).
- Quantidades devem ser fornecidas em GRAMAS (g) para sólidos e MILILITROS (ml) para líquidos.
- Toda propriedade "quantity" deve ser um número estritamente maior que zero. Nunca retorne quantity igual a zero.
- Calcule os valores de cada item proporcionalmente à quantidade escolhida usando os valores por 100g ou 100ml da lista.
- Em cada modelo, a soma das calorias deve ficar entre ${payload.tdee.dailyCalorieTarget - 50} e ${payload.tdee.dailyCalorieTarget + 50} kcal.
- Em cada modelo, a proteína deve ficar entre ${Math.max(0, payload.tdee.proteinTarget - Math.max(5, payload.tdee.proteinTarget * 0.05))} e ${payload.tdee.proteinTarget + Math.max(5, payload.tdee.proteinTarget * 0.05)}g.
- Em cada modelo, os carboidratos devem ficar entre ${Math.max(0, payload.tdee.carbsTarget - Math.max(5, payload.tdee.carbsTarget * 0.05))} e ${payload.tdee.carbsTarget + Math.max(5, payload.tdee.carbsTarget * 0.05)}g.
- Em cada modelo, a gordura deve ficar entre ${Math.max(0, payload.tdee.fatTarget - Math.max(5, payload.tdee.fatTarget * 0.05))} e ${payload.tdee.fatTarget + Math.max(5, payload.tdee.fatTarget * 0.05)}g.
- Antes de responder, some novamente todos os itens de cada modelo e ajuste suas quantidades até que TODAS as quatro metas estejam dentro dessas margens.

---

### 3. Formato de saída (JSON)

Retorne APENAS um objeto JSON válido, sem Markdown, comentários ou texto adicional.
- O objeto raiz deve conter exatamente as chaves "dayA", "dayB", "dayC" e "dayD".
- Cada dia deve conter somente a propriedade "meals", que é uma lista de refeições.
- Cada refeição deve conter somente "mealType" e "items".
- Cada item deve conter exatamente: "name", "quantity", "unit", "calories", "protein", "carbs" e "fat".
- "mealType" deve ser um destes valores: "cafe_da_manha", "lanche_da_manha", "almoco", "lanche_da_tarde", "pre_treino", "pos_treino", "jantar" ou "ceia".
- Todos os campos nutricionais e "quantity" devem ser números, não strings.
- Não inclua totais diários, explicações, observações ou outras propriedades no JSON.

---

### 4. Restrições adicionais

- Respeite as preferências e restrições informadas.
- Varie os alimentos entre os modelos de dia para evitar monotonia.
- Inclua fontes de proteína, carboidratos complexos e gorduras saudáveis em todas as refeições principais.
- Se o usuário não informar preferências, use alimentos comuns e variados.
- Cada modelo de dia gerado será repetido por várias semanas.

---

### 5. Regras de composição por perfil e tipo de alimento

- Alimentos de folha e saladas cruas devem receber uma porção estimada em gramas, sempre maior que zero, assim como os demais alimentos.
- Vegetais cozidos (cenoura, brócolis, abobrinha, couve, beterraba) continuam com porção em gramas normalmente.
- Se a categoria da dieta for "fit": use "pre_treino" e "pos_treino" NO LUGAR de "lanche_da_manha" e "ceia", em TODOS os 4 modelos de dia. Elas SUBSTITUEM essas refeições, não se somam a elas — o total de refeições do dia deve continuar igual ao número informado.
- "pre_treino" e "pos_treino" não têm horário fixo: são consumidas antes e depois do treino, no horário em que o usuário treinar.
- Se a categoria da dieta for "normal": não inclua "pre_treino" nem "pos_treino"; use "lanche_da_manha" e "lanche_da_tarde" normalmente.
- Suplementos (whey, hipercalórico, albumina, barra de proteína) só podem aparecer se o uso de suplementos estiver informado. Caso contrário, use fonte de proteína real da mesma categoria.
- No máximo DUAS leguminosas diferentes (feijões, lentilha, ervilha, tremoço) por dia. Empilhar três ou mais fecha os macros na conta, mas gera volume e fibra excessivos.
${buildHealthGuidance(healthConditions, dietRestriction)}

Agora, gere os 4 modelos de dia (dayA, dayB, dayC, dayD) com base nos dados fornecidos.`;
}
