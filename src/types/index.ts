export type UiLanguage =
  | 'en'
  | 'it'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'ca';

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
  /** Guest mode: session lives in memory only; cleared when the app closes */
  isGuest?: boolean;
}

export interface ScanResult {
  barcode: string;
  productName: string;
  ingredientsText: string;
  safe: boolean;
  matched: MatchedIngredient[];
  unknown?: string[];
  /** Why we could not confidently say SAFE */
  unknownReason?: 'no_avoid_list' | 'no_ingredients' | 'product_not_found';
  /** How many avoid-list items were checked */
  avoidCount?: number;
  /** Offer manual paste of label ingredients */
  needsManualIngredients?: boolean;
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
  /** Open Food Facts allergen tags e.g. en:milk */
  allergenTags?: string[];
  /** Open Food Facts ingredient tags (may include long free-text tags) */
  ingredientTags?: string[];
  /** Open Food Facts category tags e.g. en:kefir, en:yogurts */
  categoryTags?: string[];
}
