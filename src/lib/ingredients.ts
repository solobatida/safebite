import { SEED_INGREDIENTS } from '@/data/ingredients.seed';
import type { Ingredient, MatchedIngredient, UiLanguage } from '@/types';
import { getCustomIngredients } from '@/lib/storage';

let cache: Ingredient[] | null = null;
let searchIndex: { term: string; ingredientId: string }[] | null = null;

export async function loadIngredients(): Promise<Ingredient[]> {
  if (cache) return cache;
  const custom = await getCustomIngredients();
  cache = [...SEED_INGREDIENTS, ...custom];
  buildSearchIndex(cache);
  return cache;
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

export async function searchIngredients(query: string, limit = 12): Promise<Ingredient[]> {
  const list = await loadIngredients();
  const q = normalize(query);
  if (!q) return list.slice(0, limit);

  const scored = list
    .map((ing) => {
      const label = getDisplayLabel(ing, 'en');
      const n = normalize(label);
      let score = 0;
      if (n.startsWith(q)) score = 100;
      else if (n.includes(q)) score = 50;
      else if (ing.id.includes(q.replace(/\s/g, '-'))) score = 40;
      else {
        for (const v of Object.values(ing.labels)) {
          const nv = v ? normalize(v) : '';
          if (nv.startsWith(q)) score = Math.max(score, 90);
          else if (nv.includes(q)) score = Math.max(score, 45);
        }
      }
      return { ing, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.ing);
}

export function getDisplayLabel(ing: Ingredient, lang: UiLanguage): string {
  return ing.labels[lang] ?? ing.labels.en ?? ing.id;
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

export async function matchAvoidList(
  ingredientsText: string,
  avoidIds: string[],
  uiLang: UiLanguage
): Promise<{ safe: boolean; matched: MatchedIngredient[]; unknown: string[] }> {
  const list = await loadIngredients();
  const avoidSet = new Set(avoidIds);
  const haystack = normalize(ingredientsText);
  const matched: MatchedIngredient[] = [];

  for (const ing of list) {
    if (!avoidSet.has(ing.id)) continue;
    for (const term of getAllTerms(ing)) {
      if (term.length < 3) continue;
      if (containsTerm(haystack, term)) {
        matched.push({
          id: ing.id,
          label: getDisplayLabel(ing, uiLang),
          matchedTerm: term,
        });
        break;
      }
    }
  }

  const unknown = findUnknownTokens(ingredientsText, list);
  return { safe: matched.length === 0, matched, unknown };
}

function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\s,;(])${escaped}([\\s,;.)]|$)`, 'iu');
  return re.test(haystack) || haystack.includes(term);
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
