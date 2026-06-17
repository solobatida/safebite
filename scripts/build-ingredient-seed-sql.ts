/**
 * Generates supabase/seed-ingredients.sql from src/data/ingredients.seed.ts
 * Run: npm run db:seed-sql
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { SEED_INGREDIENTS } from '../src/data/ingredients.seed';

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlTextArray(arr: string[] | undefined): string {
  if (!arr?.length) return 'array[]::text[]';
  return `array[${arr.map((a) => sqlString(a)).join(', ')}]::text[]`;
}

const rows = SEED_INGREDIENTS.map((ing) => {
  const labels = sqlString(JSON.stringify(ing.labels));
  const aliases = sqlTextArray(ing.aliases);
  return `  (${sqlString(ing.id)}, ${sqlString(ing.category)}, ${labels}::jsonb, ${aliases}, 'approved')`;
});

const sql = `-- Auto-generated from src/data/ingredients.seed.ts — do not edit by hand
-- Regenerate: npm run db:seed-sql
-- Run in Supabase SQL Editor AFTER schema.sql

insert into public.ingredients (id, category, labels, aliases, status)
values
${rows.join(',\n')}
on conflict (id) do update set
  category = excluded.category,
  labels = excluded.labels,
  aliases = excluded.aliases,
  status = excluded.status;
`;

const out = resolve(__dirname, '../supabase/seed-ingredients.sql');
writeFileSync(out, sql, 'utf8');
console.log(`Wrote ${SEED_INGREDIENTS.length} ingredients → ${out}`);
