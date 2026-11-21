import type { ProductLookup, UiLanguage } from '@/types';

const BASE = 'https://world.openfoodfacts.org/api/v2/product';

/** Demo barcodes that work well for testing */
export const DEMO_BARCODES = {
  nutella: '3017620422003',
  cocaCola: '5449000000996',
  water: '8000500310427',
};

/** OFF field suffixes to try for a UI language (best → fallback). */
function langPriority(uiLang?: UiLanguage): string[] {
  switch (uiLang) {
    case 'es':
      return ['es', 'ca', 'en', 'fr', 'it', 'pt', 'de'];
    case 'ca':
      return ['ca', 'es', 'en', 'fr'];
    case 'fr':
      return ['fr', 'en', 'es'];
    case 'de':
      return ['de', 'en', 'fr'];
    case 'it':
      return ['it', 'en', 'fr', 'es'];
    case 'pt':
      return ['pt', 'es', 'en'];
    case 'ru':
      return ['ru', 'en'];
    case 'ar':
      return ['ar', 'en', 'fr'];
    case 'en':
    default:
      return ['en', 'es', 'fr', 'de', 'it', 'pt'];
  }
}

function pickLocalizedString(
  p: Record<string, unknown>,
  base: string,
  uiLang?: UiLanguage
): string {
  for (const lang of langPriority(uiLang)) {
    const v = p[`${base}_${lang}`];
    if (typeof v === 'string' && v.trim().length > 1) return v.trim();
  }
  const plain = p[base];
  if (typeof plain === 'string' && plain.trim().length > 1) return plain.trim();
  return '';
}

function allLocalizedStrings(p: Record<string, unknown>, base: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [k, v] of Object.entries(p)) {
    if (!k.startsWith(base)) continue;
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t.length < 2) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function barcodeCandidates(raw: string): string[] {
  const code = raw.replace(/\D/g, '');
  if (!code) return [];
  const out = new Set<string>([code]);
  // EAN-13 often stored with leading zero when scanned as 12 digits
  if (code.length === 12) out.add(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) out.add(code.slice(1));
  return [...out];
}

function parseProduct(
  p: Record<string, unknown>,
  fallbackName: string,
  uiLang?: UiLanguage
): ProductLookup {
  const name =
    pickLocalizedString(p, 'product_name', uiLang) ||
    pickLocalizedString(p, 'generic_name', uiLang) ||
    (typeof p.brands === 'string' && p.brands) ||
    fallbackName;

  // Prefer UI language for what the user sees; keep every language for matching.
  const preferredIngredients =
    pickLocalizedString(p, 'ingredients_text_with_allergens', uiLang) ||
    pickLocalizedString(p, 'ingredients_text', uiLang);
  const allIngredientTexts = [
    ...allLocalizedStrings(p, 'ingredients_text_with_allergens'),
    ...allLocalizedStrings(p, 'ingredients_text'),
  ];
  const uniqueTexts = [...new Set([preferredIngredients, ...allIngredientTexts].filter(Boolean))];
  // Preferred language first so the scan preview reads correctly
  const ingredientsText = uniqueTexts.join('\n');

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

  const traceTags = [
    ...(Array.isArray(p.traces_tags) ? p.traces_tags : []),
    ...(Array.isArray(p.traces_hierarchy) ? p.traces_hierarchy : []),
    ...(typeof p.traces === 'string'
      ? p.traces.split(/,|;/).map((s: string) => s.trim()).filter(Boolean)
      : []),
  ]
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
    traceTags: [...new Set(traceTags)],
    categoryTags: [...new Set(categoryTags)],
  };
}

const OFF_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': 'SafeBite/1.0 (intolerance checker)' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProductByBarcode(
  barcode: string,
  uiLang?: UiLanguage
): Promise<ProductLookup> {
  let sawNetworkError = false;

  for (const code of barcodeCandidates(barcode)) {
    try {
      const res = await fetchWithTimeout(`${BASE}/${code}.json`);
      if (!res.ok) {
        if (res.status >= 500) sawNetworkError = true;
        continue;
      }

      const data = await res.json();
      const p = data?.product;
      if (!p || data.status !== 1) continue;

      return parseProduct(p as Record<string, unknown>, 'Unknown product', uiLang);
    } catch {
      sawNetworkError = true;
    }
  }

  return { found: false, name: '', ingredientsText: '', networkError: sawNetworkError };
}
