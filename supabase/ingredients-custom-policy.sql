-- Allow authenticated users to add custom ingredients to the shared catalog
-- Run once in Supabase SQL Editor

create policy "ingredients_insert_custom"
  on public.ingredients
  for insert
  to authenticated
  with check (id like 'custom-%' and status = 'approved');

create policy "ingredients_update_custom"
  on public.ingredients
  for update
  to authenticated
  using (id like 'custom-%')
  with check (id like 'custom-%' and status = 'approved');
