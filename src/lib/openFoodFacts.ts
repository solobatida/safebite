import type { ProductLookup } from '@/types';

const BASE = 'https://world.openfoodfacts.org/api/v2/product';

/** Demo barcodes that work well for testing */
export const DEMO_BARCODES = {
  nutella: '3017620422003',
  cocaCola: '5449000000996',
  water: '8000500310427',
};

export async function fetchProductByBarcode(barcode: string): Promise<ProductLookup> {
  const code = barcode.replace(/\D/g, '');
  const res = await fetch(`${BASE}/${code}.json`, {
    headers: { 'User-Agent': 'SafeBite/1.0 (intolerance checker)' },
  });

  if (!res.ok) {
    return { found: false, name: '', ingredientsText: '' };
  }

  const data = await res.json();
  const p = data?.product;
  if (!p || data.status !== 1) {
    return { found: false, name: '', ingredientsText: '' };
  }

  const name =
    p.product_name ||
    p.product_name_en ||
    p.generic_name ||
    p.brands ||
    'Unknown product';

  // Merge every language ingredients field so "leche" / "milk" both match
  const langTexts = Object.entries(p as Record<string, unknown>)
    .filter(([k, v]) => k.startsWith('ingredients_text') && typeof v === 'string' && (v as string).trim().length > 2)
    .map(([, v]) => String(v).trim());
  const primary =
    (typeof p.ingredients_text === 'string' && p.ingredients_text.trim()) ||
    (typeof p.ingredients_text_es === 'string' && p.ingredients_text_es.trim()) ||
    (typeof p.ingredients_text_en === 'string' && p.ingredients_text_en.trim()) ||
    langTexts[0] ||
    '';
  const ingredientsText = [...new Set([primary, ...langTexts].filter(Boolean))].join('\n');

  const allergenTags = [
    ...(Array.isArray(p.allergens_tags) ? p.allergens_tags : []),
    ...(Array.isArray(p.allergens_hierarchy) ? p.allergens_hierarchy : []),
    ...(typeof p.allergens === 'string'
      ? p.allergens.split(/,|;/).map((s: string) => s.trim()).filter(Boolean)
      : []),
  ]
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .map((t) => t.toLowerCase());

  const ingredientTags = (Array.isArray(p.ingredients_tags) ? p.ingredients_tags : [])
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .map((t) => t.toLowerCase());

  const allergensFromIngredients =
    typeof p.allergens_from_ingredients === 'string' ? p.allergens_from_ingredients : '';

  return {
    found: true,
    name: String(name),
    ingredientsText: [ingredientsText, allergensFromIngredients].filter(Boolean).join('\n'),
    allergenTags: [...new Set(allergenTags)],
    ingredientTags,
  };
}
