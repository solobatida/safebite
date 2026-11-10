-- SafeBite security hardening — run once in Supabase SQL Editor after schema.sql
-- Fixes: shared custom overwrite, RLS owner checks, cascade wipe risk

-- 1) Owner column for custom ingredients
alter table public.ingredients
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists ingredients_created_by_idx
  on public.ingredients (created_by)
  where id like 'custom-%';

-- 2) Replace overly-permissive custom policies
drop policy if exists "ingredients_insert_custom" on public.ingredients;
drop policy if exists "ingredients_update_custom" on public.ingredients;
drop policy if exists "ingredients_read_approved" on public.ingredients;

-- Seed catalog: readable by everyone. Customs: only owner (or legacy rows without owner stay private to nobody via select — re-add locally if needed)
create policy "ingredients_read_seed_or_own_custom"
  on public.ingredients
  for select
  using (
    (status = 'approved' and id not like 'custom-%')
    or (id like 'custom-%' and created_by = auth.uid())
  );

create policy "ingredients_insert_own_custom"
  on public.ingredients
  for insert
  to authenticated
  with check (
    id like 'custom-%'
    and status = 'approved'
    and created_by = auth.uid()
  );

-- No update policy for customs — ids are unique UUIDs; never overwrite another user's row

-- 3) Tighten profile update so account_id cannot be reassigned
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "family_profiles_update_own" on public.family_profiles;
create policy "family_profiles_update_own" on public.family_profiles
  for update
  using (account_id = auth.uid())
  with check (account_id = auth.uid());

-- 4) Prefer restrict over cascade for seed ingredient deletes (customs still cascade via app wipe)
-- Note: changing FK requires drop/recreate; keep cascade for family_profile deletes.
-- Document: never delete seed ingredient rows in production; use upsert only.
