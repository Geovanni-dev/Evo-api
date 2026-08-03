import { PrismaClient } from '../node_modules/.prisma/client/index.js'; // Import the PrismaClient class from the @prisma/client package

const prisma = new PrismaClient(); // Create a new instance of the PrismaClient

const TACO_SOURCE = 'TACO 4ª edição';
const IBGE_SOURCE = 'Tabela IBGE (POF)';
const SUPPLEMENT_SOURCE = 'Seed original — composição varia conforme a marca';

const food = (
  name,
  category,
  calories,
  protein,
  carbs,
  fat,
  isVegetarian,
  isVegan,
  source = TACO_SOURCE,
) => ({
  name,
  category,
  caloriesPer100g: calories,
  proteinPer100g: protein,
  carbsPer100g: carbs,
  fatPer100g: fat,
  defaultUnit: 'g',
  source,
  isVegetarian,
  isVegan,
});

const foods = [
  // ========== protein — animal
  food('Peito de frango grelhado', 'protein', 159, 32, 0, 2.5, false, false),
  food(
    'Frango desfiado (peito cozido)',
    'protein',
    163,
    31.5,
    0,
    3.2,
    false,
    false,
  ),
  food(
    'Frango sobrecoxa sem pele assada',
    'protein',
    233,
    29.2,
    0,
    12,
    false,
    false,
  ),
  food('Patinho grelhado', 'protein', 219, 35.9, 0, 7.3, false, false),
  food(
    'Carne moída de acém cozida',
    'protein',
    212,
    26.7,
    0,
    10.9,
    false,
    false,
  ),
  food('Alcatra grelhada', 'protein', 241, 31.9, 0, 11.6, false, false),
  food('Coxão mole cozido', 'protein', 219, 32.4, 0, 8.9, false, false),
  food('Lagarto cozido', 'protein', 222, 32.9, 0, 9.1, false, false),
  food('Músculo bovino cozido', 'protein', 194, 31.2, 0, 6.7, false, false),
  food('Lombo suíno assado', 'protein', 210, 35.7, 0, 6.4, false, false),
  food('Ovo cozido', 'protein', 146, 13.3, 0.6, 9.5, true, false),
  food('Clara de ovo cozida', 'protein', 59, 13.4, 0, 0.1, true, false),
  food('Merluza filé assado', 'protein', 122, 26.6, 0, 0.9, false, false),
  food('Cação posta cozida', 'protein', 116, 25.6, 0, 0.7, false, false),
  food(
    'Tilápia filé grelhado',
    'protein',
    96,
    20.1,
    0,
    1.7,
    false,
    false,
    'TBCA',
  ),

  // ========== protein — vegetal

  // Hydrated form, as measured by IBGE — not the dry powder (~50g protein/100g)
  food(
    'Carne de soja (hidratada)',
    'protein',
    142.37,
    18.51,
    5.8,
    5.32,
    true,
    true,
    IBGE_SOURCE,
  ),
  food('Tofu', 'protein', 64, 6.6, 2.1, 4, true, true),
  food('Soja farinha', 'protein', 404, 36, 38.4, 14.6, true, true),
  food('Tremoço em conserva', 'protein', 121, 11.1, 12.4, 3.8, true, true),

  // ===== carb =====
  food('Arroz branco cozido', 'carb', 128, 2.5, 28.1, 0.2, true, true),
  food('Arroz integral cozido', 'carb', 124, 2.6, 25.8, 1, true, true),
  food('Feijão carioca cozido', 'carb', 76, 4.8, 13.6, 0.5, true, true),
  food('Feijão preto cozido', 'carb', 77, 4.5, 14, 0.5, true, true),
  food('Feijão fradinho cozido', 'carb', 78, 5.1, 13.5, 0.6, true, true),
  food('Lentilha cozida', 'carb', 93, 6.3, 16.3, 0.5, true, true),
  food('Pão francês', 'carb', 300, 8, 58.6, 3.1, true, false),
  food('Pão integral', 'carb', 253, 9.4, 49.9, 3.7, true, false),
  food('Pão de forma', 'carb', 253, 12, 44.1, 2.7, true, false),
  food('Aveia em flocos', 'carb', 394, 13.9, 66.6, 8.5, true, true),
  food('Cuscuz de milho cozido', 'carb', 113, 2.2, 25.3, 0.7, true, true),
  food('Batata inglesa cozida', 'carb', 52, 1.2, 11.9, 0, true, true),
  food('Batata-doce cozida', 'carb', 77, 0.6, 18.4, 0.1, true, true),
  food('Mandioca cozida', 'carb', 125, 0.6, 30.1, 0.3, true, true),
  food(
    'Tapioca (sem manteiga)',
    'carb',
    289,
    0.36,
    71.9,
    0,
    true,
    true,
    'TBCA',
  ),
  food('Macarrão cozido', 'carb', 111, 3.8, 22.8, 1, true, true),

  // ===== fruit =====
  food('Banana prata', 'fruit', 98, 1.3, 26, 0.1, true, true),
  food('Maçã', 'fruit', 56, 0.3, 15.2, 0, true, true),
  food('Mamão', 'fruit', 40, 0.5, 10.4, 0.1, true, true),
  food('Laranja', 'fruit', 37, 1, 8.9, 0.1, true, true),
  food('Morango', 'fruit', 30, 0.9, 6.8, 0.3, true, true),
  food('Melancia', 'fruit', 33, 0.9, 8.1, 0, true, true),
  food('Manga', 'fruit', 51, 0.9, 12.8, 0.2, true, true),
  food('Abacaxi', 'fruit', 48, 0.9, 12.3, 0.1, true, true),

  // ===== vegetable =====
  food('Alface', 'vegetable', 11, 1.3, 1.7, 0.2, true, true),
  food('Tomate', 'vegetable', 15, 1.1, 3.1, 0.2, true, true),
  food('Repolho cru', 'vegetable', 17, 0.9, 3.9, 0.1, true, true),
  food('Cenoura cozida', 'vegetable', 30, 0.8, 6.7, 0.2, true, true),
  food('Brócolis cozido', 'vegetable', 25, 2.1, 4.4, 0.5, true, true),
  food('Abobrinha cozida', 'vegetable', 15, 1.1, 3, 0.2, true, true),
  food('Couve refogada', 'vegetable', 90, 1.7, 8.7, 6.6, true, true),
  food('Beterraba cozida', 'vegetable', 32, 1.3, 7.2, 0.1, true, true),
  food('Pepino', 'vegetable', 10, 0.9, 2, 0, true, true),
  food('Ervilha enlatada drenada', 'vegetable', 74, 4.6, 13.4, 0.4, true, true),

  // ===== fat =====
  food('Azeite de oliva', 'fat', 884, 0, 0, 100, true, true),
  food('Óleo de soja', 'fat', 884, 0, 0, 100, true, true),
  food('Abacate', 'fat', 96, 1.2, 6, 8.4, true, true),
  food('Amendoim', 'fat', 544, 27.2, 20.3, 43.9, true, true),

  // ===== dairy =====
  food('Leite integral', 'dairy', 60, 3.2, 4.3, 3.3, true, false),
  food('Iogurte natural desnatado', 'dairy', 41, 3.8, 5.8, 0.3, true, false),
  food('Queijo minas frescal', 'dairy', 264, 17.4, 3.2, 20.2, true, false),
  food('Queijo muçarela', 'dairy', 330, 22.6, 3, 25.2, true, false),
  food('Queijo ricota', 'dairy', 140, 12.6, 3.8, 8.1, true, false),
  food('Requeijão cremoso', 'dairy', 257, 9.6, 2.4, 23.4, true, false),

  // ===== supplement =====
  food(
    'Whey protein concentrado (pó)',
    'supplement',
    400,
    80,
    8,
    6.5,
    true,
    false,
    SUPPLEMENT_SOURCE,
  ),
  food(
    'Hipercalórico (pó)',
    'supplement',
    380,
    15,
    65,
    5,
    false,
    false,
    SUPPLEMENT_SOURCE,
  ),
  food(
    'Albumina (pó)',
    'supplement',
    372,
    84,
    4,
    0,
    true,
    false,
    SUPPLEMENT_SOURCE,
  ),
  food(
    'Barra de proteína',
    'supplement',
    380,
    30,
    40,
    12,
    false,
    false,
    SUPPLEMENT_SOURCE,
  ),
];

// Function to seed the database
async function main() {
  for (const food of foods) {
    await prisma.foodReference.upsert({
      where: { name: food.name }, // Use the name as the unique identifier
      update: food,
      create: food,
    });
  }
}

main() // Call the main function
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect(); // Disconnect from the database
  });
