/**
 * One-off: inject Catalan labels into ingredients.seed.ts
 * Run: npx tsx scripts/add-catalan-labels.ts
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { SEED_INGREDIENTS } from '../src/data/ingredients.seed';

const CA: Record<string, string> = {
  sugar: 'sucre',
  glucose: 'glucosa',
  fructose: 'fructosa',
  lactose: 'lactosa',
  maltose: 'maltosa',
  honey: 'mel',
  'agave-syrup': "xarop d'atzavara",
  'maple-syrup': "xarop d'erable",
  sorbitol: 'sorbitol',
  mannitol: 'mannitol',
  xylitol: 'xilitol',
  maltitol: 'maltitol',
  erythritol: 'eritritol',
  'corn-starch': 'midó de blat de moro',
  'potato-starch': 'midó de patata',
  'tapioca-starch': 'midó de tapioca',
  'rice-starch': "midó d'arròs",
  'wheat-starch': 'midó de blat',
  'modified-starch': 'midó modificat',
  'wheat-flour': 'farina de blat',
  'corn-flour': 'farina de blat de moro',
  'rice-flour': "farina d'arròs",
  'potato-flour': 'farina de patata',
  'almond-flour': "farina d'ametlla",
  'coconut-flour': 'farina de coco',
  'buckwheat-flour': 'farina de fajol',
  'spelt-flour': "farina d'espelta",
  wheat: 'blat',
  barley: 'ordi',
  rye: 'sègol',
  oats: 'civada',
  gluten: 'gluten',
  milk: 'llet',
  butter: 'mantega',
  cheese: 'formatge',
  cream: 'nata',
  whey: 'xerigot',
  casein: 'caseïna',
  egg: 'ou',
  soy: 'soia',
  peanut: 'cacauet',
  almond: 'ametlla',
  hazelnut: 'avellana',
  walnut: 'nou',
  cashew: 'anacard',
  pistachio: 'pistatxo',
  sesame: 'sèsam',
  mustard: 'mostassa',
  celery: 'api',
  lupin: 'tramús',
  sulphites: 'sulfits',
  fish: 'peix',
  salmon: 'salmó',
  tuna: 'tonyina',
  shrimp: 'gamba',
  pork: 'porc',
  beef: 'vedella',
  chicken: 'pollastre',
  gelatin: 'gelatina',
  apple: 'poma',
  banana: 'plàtan',
  orange: 'taronja',
  lemon: 'llimona',
  strawberry: 'maduixa',
  grape: 'raïm',
  tomato: 'tomàquet',
  onion: 'ceba',
  garlic: 'all',
  potato: 'patata',
  carrot: 'pastanaga',
  pepper: 'pebrot',
  mushroom: 'xampinyó',
  spinach: 'espinac',
  basil: 'alfàbrega',
  oregano: 'orenga',
  parsley: 'julivert',
  cinnamon: 'canyella',
  vanilla: 'vainilla',
  cocoa: 'cacau',
  'palm-oil': 'oli de palma',
  'sunflower-oil': 'oli de gira-sol',
  'olive-oil': "oli d'oliva",
  'monosodium-glutamate': 'glutamat monosòdic',
  carrageenan: 'carragenà',
  lecithin: 'lecitina',
  'ascorbic-acid': 'àcid ascòrbic',
  'citric-acid': 'àcid cítric',
  'benzoic-acid': 'àcid benzoic',
  aspartame: 'aspartam',
  'acesulfame-k': 'acesulfam K',
  stevia: 'estévia',
  histamine: 'histamina',
  yeast: 'llevat',
  vinegar: 'vinagre',
  wine: 'vi',
  coconut: 'coco',
  avocado: 'alvocat',
  legumes: 'llegums',
  chickpea: 'ciuró',
  lentil: 'llentia',
  corn: 'blat de moro',
  rice: 'arròs',
  quinoa: 'quinoa',
  amaranth: 'amarant',
  'garlic-powder': 'all en pols',
  'onion-powder': 'ceba en pols',
  caffeine: 'cafeïna',
  theobromine: 'teobromina',
  fructans: 'fructans',
  inulin: 'inulina',
  polyols: 'poliòls',
  dextrose: 'dextrosa',
  'invert-sugar': 'sucre invertit',
  'barley-malt': "malt d'ordi",
  'malt-extract': 'extracte de malt',
};

const missing = SEED_INGREDIENTS.filter((i) => !CA[i.id]).map((i) => i.id);
if (missing.length) {
  console.error('Missing CA for:', missing);
  process.exit(1);
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatLabels(labels: Record<string, string>) {
  const order = ['en', 'ca', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ar'];
  const parts = order
    .filter((k) => labels[k])
    .map((k) => `${k}: '${esc(labels[k])}'`);
  for (const [k, v] of Object.entries(labels)) {
    if (!order.includes(k)) parts.push(`${k}: '${esc(v)}'`);
  }
  return `{ ${parts.join(', ')} }`;
}

function formatAliases(aliases?: string[]) {
  if (!aliases?.length) return '';
  return `, aliases: [${aliases.map((a) => `'${esc(a)}'`).join(', ')}]`;
}

let out = `import type { Ingredient } from '@/types';\n\n/** Canonical ingredient database — expand via Supabase sync later */\nexport const SEED_INGREDIENTS: Ingredient[] = [\n`;

for (const ing of SEED_INGREDIENTS) {
  const labels = { ...ing.labels, ca: CA[ing.id] } as Record<string, string>;
  out += `  { id: '${ing.id}', category: '${ing.category}', labels: ${formatLabels(labels)}${formatAliases(ing.aliases)} },\n`;
}
out += `];\n`;

const path = resolve(__dirname, '../src/data/ingredients.seed.ts');
writeFileSync(path, out, 'utf8');
console.log(`Updated ${SEED_INGREDIENTS.length} ingredients with Catalan → ${path}`);
