import { fetchProductByBarcode } from '@/lib/openFoodFacts';
import { matchAvoidList } from '@/lib/ingredients';
import type { ScanResult, UiLanguage } from '@/types';

export async function checkBarcode(
  barcode: string,
  avoidIds: string[],
  uiLang: UiLanguage
): Promise<ScanResult | null> {
  const product = await fetchProductByBarcode(barcode);
  if (!product.found) return null;

  const { safe, matched, unknown } = await matchAvoidList(
    product.ingredientsText,
    avoidIds,
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
    matched,
    unknown,
  };
}
