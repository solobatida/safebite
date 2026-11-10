import { SEED_INGREDIENTS } from '@/data/ingredients.seed';
import type { Ingredient, MatchedIngredient, UiLanguage } from '@/types';
import { getCustomIngredients } from '@/lib/storage';

let cache: Ingredient[] | null = null;
let searchIndex: { term: string; ingredientId: string }[] | null = null;
let loadInFlight: Promise<Ingredient[]> | null = null;

export function clearIngredientsCache(): void {
  cache = null;
  searchIndex = null;
  loadInFlight = null;
}

export async function loadIngredients(): Promise<Ingredient[]> {
  if (cache) return cache;
  if (loadInFlight) return loadInFlight;

  loadInFlight = (async () => {
    const custom = await getCustomIngredients();
    let remoteCustom: Ingredient[] = [];
    let remoteOk = true;

    try {
      const { supabase, supabaseEnabled } = await import('@/lib/supabase');
      const { getSession } = await import('@/lib/storage');
      const session = await getSession();
      if (
        supabaseEnabled &&
        supabase &&
        session &&
        !session.isGuest &&
        !session.userId.startsWith('local-')
      ) {
        const { data, error } = await supabase
          .from('ingredients')
          .select('id,category,labels,aliases')
          .like('id', 'custom-%');
        if (error) {
          remoteOk = false;
        } else {
          remoteCustom = (data ?? []).map((row: any) => ({
            id: row.id as string,
            category: (row.category as Ingredient['category']) || 'other',
            labels: (row.labels ?? {}) as Ingredient['labels'],
            aliases: (row.aliases as string[] | undefined) ?? [],
          }));
        }
      }
    } catch {
      remoteOk = false;
    }

    const byId = new Map<string, Ingredient>();
    for (const ing of [...SEED_INGREDIENTS, ...custom, ...remoteCustom]) {
      byId.set(ing.id, ing);
    }
    const merged = [...byId.values()];
    // Only cache a complete catalog; retry remote customs next time if fetch failed
    if (remoteOk) {
      cache = merged;
      buildSearchIndex(cache);
    } else {
      buildSearchIndex(merged);
    }
    return merged;
  })();

  try {
    return await loadInFlight;
  } finally {
    loadInFlight = null;
  }
}

function buildSearchIndex(ingredients: Ingredient[]): void {
  searchIndex = [];
  for (const ing of ingredients) {
    const terms = new Set<string>();
    for (const label of Object.values(ing.labels)) {
      if (label) terms.add(normalize(label));
    }
    for (const alias of ing.aliases ?? []) {
      terms.add(normalize(alias));
    }
    for (const term of terms) {
      if (term.length >= 2) searchIndex.push({ term, ingredientId: ing.id });
    }
  }
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Terms for suggestion search: active language label + aliases (not other UI languages). */
function suggestionTerms(ing: Ingredient, lang: UiLanguage): string[] {
  const label = ing.labels[lang]?.trim();
  if (!label) return [];
  const terms = new Set<string>([normalize(label)]);
  for (const word of normalize(label).split(' ')) {
    if (word.length >= 2) terms.add(word);
  }
  for (const alias of ing.aliases ?? []) {
    const na = normalize(alias);
    if (na.length >= 2) terms.add(na);
    for (const word of na.split(' ')) {
      if (word.length >= 2) terms.add(word);
    }
  }
  return [...terms];
}

function scoreAgainstQuery(terms: string[], q: string): number {
  if (!q || terms.length === 0) return 0;
  let score = 0;
  const full = terms[0];
  if (full.startsWith(q)) score = 100;
  else if (full.includes(q)) score = 50;
  for (const term of terms) {
    if (term.startsWith(q)) score = Math.max(score, term === full ? 100 : 80);
    else if (term.includes(q)) score = Math.max(score, 35);
  }
  return score;
}

export async function searchIngredients(
  query: string,
  limit = 12,
  lang: UiLanguage = 'es'
): Promise<Ingredient[]> {
  const list = await loadIngredients();
  // Accents, commas and other punctuation are stripped in normalize()
  const q = normalize(query);

  // Suggestions only for ingredients with a label in the active UI language
  const withLang = list.filter((ing) => Boolean(ing.labels[lang]?.trim()));

  if (!q) return withLang.slice(0, limit);

  const scored = withLang
    .map((ing) => ({
      ing,
      score: scoreAgainstQuery(suggestionTerms(ing, lang), q),
      label: normalize(ing.labels[lang] ?? ''),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  return scored.slice(0, limit).map((x) => x.ing);
}

/** Label shown in the UI for the active language (no cross-language fallback for suggestions). */
export function getDisplayLabel(ing: Ingredient, lang: UiLanguage): string {
  const primary = ing.labels[lang]?.trim();
  if (primary) return primary;
  // Custom / incomplete rows only
  return ing.labels.en?.trim() || ing.id;
}

export function getAllTerms(ing: Ingredient): string[] {
  const terms = new Set<string>();
  for (const label of Object.values(ing.labels)) {
    if (label) terms.add(normalize(label));
  }
  for (const alias of ing.aliases ?? []) {
    terms.add(normalize(alias));
  }
  return [...terms];
}

/** Broad OFF tag ids that also match when the user avoids a more specific child. */
const BROAD_TAG_COVERS: Record<string, string[]> = {
  'tree-nuts': [
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
  ],
  milk: [
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
  ],
  fish: [
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
  ],
  crustaceans: ['shrimp', 'lobster', 'crab', 'langoustine', 'crayfish'],
  molluscs: ['octopus', 'squid', 'cuttlefish', 'mussel', 'clam', 'oyster', 'scallop'],
  wheat: ['gluten', 'barley', 'rye', 'barley-malt', 'malt-extract', 'wheat-flour', 'semolina'],
  gluten: ['wheat', 'barley', 'rye', 'barley-malt', 'malt-extract', 'wheat-flour', 'semolina'],
  soy: ['soy-flour'],
  egg: [],
};

function avoidHitsCatalogId(catalogId: string, avoidSet: Set<string>): boolean {
  if (avoidSet.has(catalogId)) return true;
  const children = BROAD_TAG_COVERS[catalogId];
  if (children?.some((id) => avoidSet.has(id))) return true;
  // Specific avoid → broad tag (e.g. avoid almond, OFF says en:nuts)
  for (const [broad, kids] of Object.entries(BROAD_TAG_COVERS)) {
    if (kids.includes(catalogId) && avoidSet.has(broad)) return true;
  }
  return false;
}

export async function matchAvoidList(
  ingredientsText: string,
  avoidIds: string[],
  uiLang: UiLanguage,
  extra: {
    allergenTags?: string[];
    ingredientTags?: string[];
    traceTags?: string[];
  } = {}
): Promise<{
  safe: boolean;
  matched: MatchedIngredient[];
  mayContain: MatchedIngredient[];
  unknown: string[];
}> {
  const list = await loadIngredients();
  const avoidSet = new Set(avoidIds);
  const textNorm = normalize(ingredientsText);
  const tagHaystack = normalize(
    [...(extra.allergenTags ?? []), ...(extra.ingredientTags ?? [])].join(' ')
  );
  // Text + tags for positive matching; tags alone never declare SAFE (caller enforces)
  const haystack = normalize([ingredientsText, tagHaystack].filter(Boolean).join(' '));
  const matched: MatchedIngredient[] = [];
  const matchedIds = new Set<string>();
  const mayContain: MatchedIngredient[] = [];
  const mayContainIds = new Set<string>();

  const pushMatch = (
    id: string,
    matchedTerm: string,
    into: MatchedIngredient[],
    seen: Set<string>
  ) => {
    if (seen.has(id)) return;
    const ing = list.find((x) => x.id === id);
    if (!ing) return;
    into.push({ id, label: getDisplayLabel(ing, uiLang), matchedTerm });
    seen.add(id);
  };

  for (const tag of extra.allergenTags ?? []) {
    const id = OFF_ALLERGEN_TO_ID[tag.toLowerCase()] ?? inferAllergenIdFromTag(tag);
    if (id && avoidHitsCatalogId(id, avoidSet)) {
      pushMatch(id, tag, matched, matchedIds);
    }
  }

  for (const tag of extra.ingredientTags ?? []) {
    const id = OFF_ALLERGEN_TO_ID[tag.toLowerCase()] ?? inferAllergenIdFromTag(tag);
    if (id && avoidHitsCatalogId(id, avoidSet)) {
      pushMatch(id, tag, matched, matchedIds);
    }
  }

  for (const tag of extra.traceTags ?? []) {
    const id = OFF_ALLERGEN_TO_ID[tag.toLowerCase()] ?? inferAllergenIdFromTag(tag);
    if (id && avoidHitsCatalogId(id, avoidSet) && !matchedIds.has(id)) {
      pushMatch(id, `trace:${tag}`, mayContain, mayContainIds);
    }
  }

  for (const ing of list) {
    if (!avoidSet.has(ing.id) || matchedIds.has(ing.id)) continue;
    for (const term of getAllTerms(ing)) {
      if (term.length < 2) continue;
      // Prefer ingredient text; fall back to tag haystack for longer terms only
      const inText = textNorm ? containsTerm(textNorm, term) : false;
      const inTags = !inText && term.length >= 3 ? containsTerm(haystack, term) : false;
      if (inText || inTags) {
        pushMatch(ing.id, term, matched, matchedIds);
        break;
      }
    }
  }

  const unknown = findUnknownTokens(ingredientsText, list);
  return {
    safe: matched.length === 0 && mayContain.length === 0,
    matched,
    mayContain,
    unknown,
  };
}

/** Open Food Facts allergen taxonomy → catalog ingredient ids */
const OFF_ALLERGEN_TO_ID: Record<string, string> = {
  'en:milk': 'milk',
  'en:dairy': 'milk',
  'en:lactose': 'lactose',
  'en:eggs': 'egg',
  'en:egg': 'egg',
  'en:gluten': 'wheat',
  'en:wheat': 'wheat',
  'en:peanuts': 'peanut',
  'en:peanut': 'peanut',
  'en:nuts': 'tree-nuts',
  'en:tree-nuts': 'tree-nuts',
  'en:almonds': 'almond',
  'en:hazelnuts': 'hazelnut',
  'en:walnuts': 'walnut',
  'en:cashew-nuts': 'cashew',
  'en:pistachio-nuts': 'pistachio',
  'en:macadamia-nuts': 'macadamia',
  'en:brazil-nuts': 'brazil-nut',
  'en:pecan-nuts': 'pecan',
  'en:soybeans': 'soy',
  'en:soy': 'soy',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sesame-seeds': 'sesame',
  'en:sesame': 'sesame',
  'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:sulfites': 'sulphites',
  'en:lupin': 'lupin',
  'en:fish': 'fish',
  'en:crustaceans': 'crustaceans',
  'en:molluscs': 'molluscs',
  'en:mollusks': 'molluscs',
  // Spanish / multilingual allergen tags sometimes appear without en: prefix
  'es:leche': 'milk',
  'es:huevo': 'egg',
  'es:huevos': 'egg',
  'es:gluten': 'wheat',
  'es:cacahuete': 'peanut',
  'es:cacahuetes': 'peanut',
  'es:soja': 'soy',
  'es:frutos-de-cascara': 'tree-nuts',
  'es:frutos-secos': 'tree-nuts',
  'es:pescado': 'fish',
  'es:crustaceos': 'crustaceans',
  'es:moluscos': 'molluscs',
  'es:sesamo': 'sesame',
  'es:mostaza': 'mustard',
  'es:apio': 'celery',
  'es:altramuces': 'lupin',
  'es:sulfitos': 'sulphites',
};

/** Infer catalog id from free-form OFF tags / allergen strings. */
function inferAllergenIdFromTag(tag: string): string | null {
  const n = normalize(tag);
  if (!n) return null;
  if (
    /\b(milk|leche|llet|lait|milch|latte|leite|dairy|lactose|lactos|lacteos|lactea|whey|casein|caseina|suero)\b/.test(
      n
    )
  ) {
    return 'milk';
  }
  if (/\b(egg|eggs|huevo|huevos|ou|uovo|oeuf|ei)\b/.test(n)) return 'egg';
  if (/\b(peanut|cacahuete|cacahuetes|cacahuate|arachide|erdnuss|mani)\b/.test(n)) return 'peanut';
  if (/\b(soy|soja|soya)\b/.test(n)) return 'soy';
  if (/\b(gluten|wheat|trigo|ble|weizen|blat)\b/.test(n)) return 'wheat';
  if (/\b(sesame|sesamo|sesam)\b/.test(n)) return 'sesame';
  if (/\b(mustard|mostaza|moutarde|senf|mostassa)\b/.test(n)) return 'mustard';
  if (/\b(celery|apio|celeri|sellerie|api)\b/.test(n)) return 'celery';
  if (/\b(crustacean|crustaceans|crustaceo|crustaceos|gamba|langostino|marisco)\b/.test(n)) {
    return 'crustaceans';
  }
  if (/\b(mollusc|molluscs|mollusk|molusco|moluscos|pulpo|calamar|mejillón|mejillon)\b/.test(n)) {
    return 'molluscs';
  }
  if (/\b(fish|pescado|peix|poisson|fisch|pesce|peixe)\b/.test(n)) return 'fish';
  if (/\b(lupin|lupine|altramuz|altramuces|tramus)\b/.test(n)) return 'lupin';
  if (/\b(sulphite|sulfite|sulfito|sulfitos)\b/.test(n)) return 'sulphites';
  return null;
}

function containsTerm(haystack: string, term: string): boolean {
  if (!term || !haystack) return false;
  // Short terms (ou, Ei, ox): word-boundary only — substring would false-positive
  if (term.length >= 3 && haystack.includes(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[\\s,;(/])${escaped}([\\s,;.)/]|$)`, 'iu');
    // Prefer boundary; allow substring only when term is long enough to be distinctive
    if (re.test(haystack) || term.length >= 5) return true;
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\s,;(/])${escaped}([\\s,;.)/]|$)`, 'iu');
  return re.test(haystack);
}

function findUnknownTokens(text: string, catalog: Ingredient[]): string[] {
  const known = new Set<string>();
  for (const ing of catalog) {
    for (const t of getAllTerms(ing)) known.add(t);
  }
  const parts = text.split(/[,;()]/).map((p) => normalize(p)).filter((p) => p.length >= 4);
  const unknown: string[] = [];
  for (const part of parts.slice(0, 8)) {
    const hit = [...known].some((k) => part.includes(k) || k.includes(part));
    if (!hit && !unknown.includes(part)) unknown.push(part);
  }
  return unknown.slice(0, 3);
}

export async function addCustomIngredient(entry: Ingredient): Promise<void> {
  const { addCustomIngredient: save } = await import('@/lib/storage');
  await save(entry);
  cache = null;
  searchIndex = null;
}

const ALL_UI_LANGS: UiLanguage[] = ['en', 'it', 'fr', 'de', 'es', 'pt', 'ru', 'ar', 'ca'];

/** Build labels for every UI language (same display text until translated). */
export function labelsForAllLanguages(name: string): Ingredient['labels'] {
  const labels: Ingredient['labels'] = {};
  for (const code of ALL_UI_LANGS) {
    labels[code] = name;
  }
  return labels;
}

export function slugifyIngredientName(name: string): string {
  const ascii = normalize(name)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ascii.length >= 2 ? ascii : `x${Date.now().toString(36)}`;
}

function newCustomIngredientId(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  return `custom-${uuid}`;
}

/**
 * Create a custom ingredient in local catalog + Supabase ingredients (if logged in).
 * Uses a per-user UUID id so users cannot overwrite each other's customs.
 */
export async function createCustomIngredient(name: string): Promise<Ingredient> {
  const text = name.trim();
  if (text.length < 2) {
    throw new Error('Escribe al menos 2 caracteres.');
  }

  const entry: Ingredient = {
    id: newCustomIngredientId(),
    category: 'other',
    labels: labelsForAllLanguages(text),
    aliases: [text, slugifyIngredientName(text).replace(/-/g, ' ')].filter(Boolean),
  };

  const { addCustomIngredient: saveLocal, getSession } = await import('@/lib/storage');
  const { supabase, supabaseEnabled } = await import('@/lib/supabase');

  const session = await getSession();
  if (
    supabaseEnabled &&
    supabase &&
    session &&
    !session.isGuest &&
    !session.userId.startsWith('local-')
  ) {
    // Insert only — never upsert/overwrite another user's custom row
    const { error } = await supabase.from('ingredients').insert({
      id: entry.id,
      category: entry.category,
      labels: entry.labels,
      aliases: entry.aliases ?? [],
      status: 'approved',
      created_by: session.userId,
    });
    if (error) throw error;
  }

  await saveLocal(entry);
  clearIngredientsCache();
  return entry;
}
