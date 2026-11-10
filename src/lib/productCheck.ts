import { fetchProductByBarcode } from '@/lib/openFoodFacts';
import { getDisplayLabel, loadIngredients, matchAvoidList } from '@/lib/ingredients';
import type { MatchedIngredient, ProductLookup, ScanResult, UiLanguage } from '@/types';

/** If user avoids milk, also check milk-protein derivatives in the same scan. */
function expandAvoidIds(ids: string[]): string[] {
  const out = new Set(ids);
  if (out.has('milk')) {
    for (const id of [
      'whey',
      'whey-protein',
      'casein',
      'cream',
      'butter',
      'buttermilk',
      'cheese',
      'cheese-powder',
      'milk-protein',
      'milk-powder',
      'lactose',
      'lactalbumin',
      'lactoglobulin',
    ]) {
      out.add(id);
    }
  }
  if (out.has('milk-protein') || out.has('milk-powder') || out.has('whey-protein')) {
    out.add('milk');
  }
  if (out.has('tree-nuts')) {
    for (const id of [
      'almond',
      'hazelnut',
      'walnut',
      'cashew',
      'pistachio',
      'macadamia',
      'pecan',
      'brazil-nut',
      'pine-nut',
      'chestnut',
      'cola-nut',
      'almond-flour',
      'hazelnut-flour',
      'walnut-flour',
      'chestnut-flour',
    ]) {
      out.add(id);
    }
  }
  if (out.has('peanut')) out.add('peanut-flour');
  if (out.has('lupin')) out.add('lupin-flour');
  if (out.has('oats')) out.add('oat-flour');
  if (out.has('wheat')) {
    out.add('wheat-flour');
    out.add('whole-wheat-flour');
    out.add('bread-flour');
    out.add('cake-flour');
    out.add('semolina');
    out.add('spelt-flour');
    out.add('kamut-flour');
  }
  if (out.has('crustaceans')) {
    for (const id of ['shrimp', 'lobster', 'crab', 'langoustine', 'crayfish']) out.add(id);
  }
  if (out.has('molluscs')) {
    for (const id of ['octopus', 'squid', 'cuttlefish', 'mussel', 'clam', 'oyster', 'scallop']) {
      out.add(id);
    }
  }
  if (out.has('fish')) {
    for (const id of [
      'salmon',
      'tuna',
      'hake',
      'cod',
      'sea-bass',
      'sea-bream',
      'sole',
      'sardine',
      'anchovy',
      'mackerel',
      'trout',
      'swordfish',
      'monkfish',
      'whiting',
      'pollock',
      'herring',
      'tilapia',
      'pangasius',
      'grouper',
      'turbot',
    ]) {
      out.add(id);
    }
  }
  if (out.has('meat')) {
    for (const id of [
      'pork',
      'beef',
      'chicken',
      'lamb',
      'turkey',
      'duck',
      'goat',
      'rabbit',
      'veal',
      'venison',
      'horse',
      'quail',
      'goose',
    ]) {
      out.add(id);
    }
  }
  return [...out];
}

/** Category tags that strongly imply milk / dairy. */
const DAIRY_CATEGORY_HINTS = [
  'en:milk',
  'en:dairies',
  'en:dairy',
  'en:fermented-milk-products',
  'en:yogurts',
  'en:yoghurts',
  'en:kefir',
  'en:cheeses',
  'en:cream',
  'en:butters',
  'en:fromages-blancs-petits-suisses',
  'en:dairy-drinks',
  'en:milk-drinks',
  'kefir',
  'yogurt',
  'yoghurt',
  'dairy',
];

function categoryImpliesMilk(tags: string[] | undefined): boolean {
  if (!tags?.length) return false;
  return tags.some((tag) => DAIRY_CATEGORY_HINTS.some((hint) => tag.includes(hint)));
}

const COLLAPSE_TO: Record<string, string> = {
  whey: 'milk',
  'whey-protein': 'milk',
  casein: 'milk',
  cream: 'milk',
  butter: 'milk',
  buttermilk: 'milk',
  cheese: 'milk',
  'cheese-powder': 'milk',
  'milk-protein': 'milk',
  'milk-powder': 'milk',
  lactose: 'milk',
  lactalbumin: 'milk',
  lactoglobulin: 'milk',
  shrimp: 'crustaceans',
  lobster: 'crustaceans',
  crab: 'crustaceans',
  langoustine: 'crustaceans',
  crayfish: 'crustaceans',
  octopus: 'molluscs',
  squid: 'molluscs',
  cuttlefish: 'molluscs',
  mussel: 'molluscs',
  clam: 'molluscs',
  oyster: 'molluscs',
  scallop: 'molluscs',
};

async function collapseMatched(
  matched: MatchedIngredient[],
  avoidIds: string[],
  uiLang: UiLanguage
): Promise<MatchedIngredient[]> {
  const userAvoid = new Set(avoidIds);
  const catalog = await loadIngredients();
  const collapsed: MatchedIngredient[] = [];
  const seen = new Set<string>();

  for (const m of matched) {
    let id = m.id;
    let label = m.label;
    const parent = COLLAPSE_TO[id];
    if (parent && !userAvoid.has(id) && userAvoid.has(parent)) {
      id = parent;
      const parentIng = catalog.find((i) => i.id === parent);
      label = parentIng ? getDisplayLabel(parentIng, uiLang) : label;
    } else if (
      !userAvoid.has(id) &&
      userAvoid.has('fish') &&
      catalog.find((i) => i.id === id)?.category === 'fish' &&
      id !== 'crustaceans' &&
      id !== 'molluscs' &&
      !COLLAPSE_TO[id]
    ) {
      id = 'fish';
      const fish = catalog.find((i) => i.id === 'fish');
      label = fish ? getDisplayLabel(fish, uiLang) : label;
    } else if (
      !userAvoid.has(id) &&
      userAvoid.has('meat') &&
      catalog.find((i) => i.id === id)?.category === 'meat'
    ) {
      id = 'meat';
      const meat = catalog.find((i) => i.id === 'meat');
      label = meat ? getDisplayLabel(meat, uiLang) : label;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    collapsed.push({ ...m, id, label });
  }
  return collapsed;
}

async function runMatch(
  product: ProductLookup,
  avoidIds: string[],
  uiLang: UiLanguage,
  barcode: string
): Promise<ScanResult> {
  const avoidCount = avoidIds.length;
  if (avoidCount === 0) {
    return {
      barcode,
      productName: product.name,
      ingredientsText: product.ingredientsText,
      safe: false,
      matched: [],
      unknownReason: 'no_avoid_list',
      avoidCount: 0,
      needsManualIngredients: false,
    };
  }

  const hasIngredientSignal =
    product.ingredientsText.trim().length > 0 ||
    (product.allergenTags?.length ?? 0) > 0 ||
    (product.ingredientTags?.length ?? 0) > 0;

  // Safety-first: dairy categories + milk on avoid list → not safe even without ingredient text
  if (!hasIngredientSignal && avoidIds.includes('milk') && categoryImpliesMilk(product.categoryTags)) {
    const catalog = await loadIngredients();
    const milk = catalog.find((i) => i.id === 'milk');
    return {
      barcode,
      productName: product.name,
      ingredientsText: product.ingredientsText,
      safe: false,
      matched: milk
        ? [
            {
              id: 'milk',
              label: getDisplayLabel(milk, uiLang),
              matchedTerm: 'category:dairy',
            },
          ]
        : [],
      avoidCount,
    };
  }

  if (!hasIngredientSignal) {
    return {
      barcode,
      productName: product.name || barcode,
      ingredientsText: '',
      safe: false,
      matched: [],
      unknownReason: product.found ? 'no_ingredients' : 'product_not_found',
      avoidCount,
      needsManualIngredients: true,
    };
  }

  const { safe, matched, unknown } = await matchAvoidList(
    product.ingredientsText,
    expandAvoidIds(avoidIds),
    uiLang,
    {
      allergenTags: product.allergenTags,
      ingredientTags: product.ingredientTags,
    }
  );

  return {
    barcode,
    productName: product.name,
    ingredientsText: product.ingredientsText,
    safe,
    matched: await collapseMatched(matched, avoidIds, uiLang),
    unknown,
    avoidCount,
  };
}

export async function checkBarcode(
  barcode: string,
  avoidIds: string[],
  uiLang: UiLanguage
): Promise<ScanResult | null> {
  const product = await fetchProductByBarcode(barcode, uiLang);

  if (!product.found) {
    // Not in OFF — still return a result so the user can paste the label
    return {
      barcode,
      productName: barcode,
      ingredientsText: '',
      safe: false,
      matched: [],
      unknownReason: 'product_not_found',
      avoidCount: avoidIds.length,
      needsManualIngredients: true,
    };
  }

  return runMatch(product, avoidIds, uiLang, barcode);
}

/** Check pasted label text against the avoid list (when OFF has no data). */
export async function checkIngredientsText(
  ingredientsText: string,
  avoidIds: string[],
  uiLang: UiLanguage,
  meta?: { barcode?: string; productName?: string }
): Promise<ScanResult> {
  const text = ingredientsText.trim();
  const barcode = meta?.barcode ?? '';
  const productName = meta?.productName ?? barcode;

  if (avoidIds.length === 0) {
    return {
      barcode,
      productName,
      ingredientsText: text,
      safe: false,
      matched: [],
      unknownReason: 'no_avoid_list',
      avoidCount: 0,
    };
  }

  if (text.length < 3) {
    return {
      barcode,
      productName,
      ingredientsText: text,
      safe: false,
      matched: [],
      unknownReason: 'no_ingredients',
      avoidCount: avoidIds.length,
      needsManualIngredients: true,
    };
  }

  const { safe, matched, unknown } = await matchAvoidList(
    text,
    expandAvoidIds(avoidIds),
    uiLang
  );

  return {
    barcode,
    productName,
    ingredientsText: text,
    safe,
    matched: await collapseMatched(matched, avoidIds, uiLang),
    unknown,
    avoidCount: avoidIds.length,
  };
}
