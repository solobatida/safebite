export type UiLanguage =
  | 'en'
  | 'it'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'ru'
  | 'ar';

export type IngredientCategory =
  | 'sugars'
  | 'sugar_alcohols'
  | 'starches'
  | 'flours'
  | 'grains'
  | 'allergens'
  | 'dairy'
  | 'nuts'
  | 'fruits'
  | 'vegetables'
  | 'herbs'
  | 'meat'
  | 'fish'
  | 'additives'
  | 'oils'
  | 'other';

export interface Ingredient {
  id: string;
  category: IngredientCategory;
  labels: Partial<Record<UiLanguage | 'en', string>>;
  aliases?: string[];
}

/** One person under an account (parent, child, partner) with their own avoid-list */
export interface FamilyProfile {
  id: string;
  displayName: string;
  createdAt: string;
}

/** Signed-in state: one account, one active family profile */
export interface UserSession {
  email: string;
  userId: string;
  accountNickname: string;
  activeProfileId: string;
  activeProfileName: string;
  uiLanguage: UiLanguage;
}

export interface ScanResult {
  barcode: string;
  productName: string;
  ingredientsText: string;
  safe: boolean;
  matched: MatchedIngredient[];
  unknown?: string[];
}

export interface MatchedIngredient {
  id: string;
  label: string;
  matchedTerm: string;
}

export interface ProductLookup {
  found: boolean;
  name: string;
  ingredientsText: string;
}
