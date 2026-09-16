import { fetchProductByBarcode } from '@/lib/openFoodFacts';
import { getDisplayLabel, loadIngredients, matchAvoidList } from '@/lib/ingredients';
import type { ScanResult, UiLanguage } from '@/types';

/** If user avoids milk, also check milk-protein derivatives in the same scan. */
function expandAvoidIds(ids: string[]): string[] {
  const out = new Set(ids);
  if (out.has('milk')) {
    out.add('whey');
    out.add('casein');
    out.add('cream');
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
    ]) {
      out.add(id);
    }
  }
  return [...out];
}

export async function checkBarcode(
  barcode: string,
  avoidIds: string[],
  uiLang: UiLanguage
): Promise<ScanResult | null> {
  const product = await fetchProductByBarcode(barcode);
  if (!product.found) return null;

  const avoidCount = avoidIds.length;
  const hasIngredientSignal =
    product.ingredientsText.trim().length > 0 ||
    (product.allergenTags?.length ?? 0) > 0 ||
    (product.ingredientTags?.length ?? 0) > 0;

  if (avoidCount === 0) {
    return {
      barcode,
      productName: product.name,
      ingredientsText: product.ingredientsText,
      safe: false,
      matched: [],
      unknownReason: 'no_avoid_list',
      avoidCount: 0,
    };
  }

  if (!hasIngredientSignal) {
    return {
      barcode,
      productName: product.name,
      ingredientsText: product.ingredientsText,
      safe: false,
      matched: [],
      unknownReason: 'no_ingredients',
      avoidCount,
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

  const userAvoid = new Set(avoidIds);
  const catalog = await loadIngredients();
  const milk = catalog.find((i) => i.id === 'milk');
  const collapsed: typeof matched = [];
  const seen = new Set<string>();

  for (const m of matched) {
    let id = m.id;
    let label = m.label;
    if (!userAvoid.has(id) && ['whey', 'casein', 'cream'].includes(id) && userAvoid.has('milk')) {
      id = 'milk';
      label = milk ? getDisplayLabel(milk, uiLang) : label;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    collapsed.push({ ...m, id, label });
  }

  return {
    barcode,
    productName: product.name,
    ingredientsText: product.ingredientsText,
    safe,
    matched: collapsed,
    unknown,
    avoidCount,
  };
}
