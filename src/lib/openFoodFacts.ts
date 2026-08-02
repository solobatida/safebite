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

  const ingredientsText =
    p.ingredients_text ||
    p.ingredients_text_ca ||
    p.ingredients_text_es ||
    p.ingredients_text_en ||
    p.ingredients_text_fr ||
    p.ingredients_text_de ||
    p.ingredients_text_it ||
    Object.entries(p)
      .filter(([k]) => k.startsWith('ingredients_text'))
      .map(([, v]) => (typeof v === 'string' ? v : ''))
      .find((v) => v.length > 10) ||
    '';

  return {
    found: true,
    name: String(name),
    ingredientsText: String(ingredientsText),
  };
}
