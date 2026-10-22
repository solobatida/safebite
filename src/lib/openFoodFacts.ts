import type { ProductLookup } from '@/types';

const BASE = 'https://world.openfoodfacts.org/api/v2/product';

/** Demo barcodes that work well for testing */
export const DEMO_BARCODES = {
  nutella: '3017620422003',
  cocaCola: '5449000000996',
  water: '8000500310427',
};

function barcodeCandidates(raw: string): string[] {
  const code = raw.replace(/\D/g, '');
  if (!code) return [];
  const out = new Set<string>([code]);
  // EAN-13 often stored with leading zero when scanned as 12 digits
  if (code.length === 12) out.add(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) out.add(code.slice(1));
  return [...out];
}

function parseProduct(p: Record<string, unknown>, fallbackName: string): ProductLookup {
  const name =
    (typeof p.product_name === 'string' && p.product_name) ||
    (typeof p.product_name_es === 'string' && p.product_name_es) ||
    (typeof p.product_name_en === 'string' && p.product_name_en) ||
    (typeof p.generic_name === 'string' && p.generic_name) ||
    (typeof p.brands === 'string' && p.brands) ||
    fallbackName;

  const langTexts = Object.entries(p)
    .filter(
      ([k, v]) =>
        k.startsWith('ingredients_text') && typeof v === 'string' && (v as string).trim().length > 2
    )
    .map(([, v]) => String(v).trim());
  const primary =
    (typeof p.ingredients_text === 'string' && p.ingredients_text.trim()) ||
    (typeof p.ingredients_text_es === 'string' && p.ingredients_text_es.trim()) ||
    (typeof p.ingredients_text_en === 'string' && p.ingredients_text_en.trim()) ||
    (typeof p.ingredients_text_de === 'string' && p.ingredients_text_de.trim()) ||
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

  const categoryTags = [
    ...(Array.isArray(p.categories_tags) ? p.categories_tags : []),
    ...(Array.isArray(p.categories_hierarchy) ? p.categories_hierarchy : []),
  ]
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
    categoryTags: [...new Set(categoryTags)],
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductLookup> {
  for (const code of barcodeCandidates(barcode)) {
    try {
      const res = await fetch(`${BASE}/${code}.json`, {
        headers: { 'User-Agent': 'SafeBite/1.0 (intolerance checker)' },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const p = data?.product;
      if (!p || data.status !== 1) continue;

      return parseProduct(p as Record<string, unknown>, 'Unknown product');
    } catch {
      // try next candidate
    }
  }

  return { found: false, name: '', ingredientsText: '' };
}
