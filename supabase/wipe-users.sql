-- SafeBite: wipe ALL users + related data (keep seed ingredients)
-- Run in Supabase → SQL Editor → Run
-- WARNING: irreversible. Auth accounts, profiles, avoid-lists, submissions gone.

-- 1) App tables that depend on users
truncate table public.user_avoid_ingredients restart identity cascade;
truncate table public.ingredient_submissions restart identity cascade;
truncate table public.family_profiles restart identity cascade;
truncate table public.profiles cascade;

-- 2) Custom ingredients added from the app (keep seed catalog)
delete from public.ingredients where id like 'custom-%';

-- 3) Auth users (email + Google). Cascades are already handled above.
delete from auth.users;

-- Optional check (should all be 0 except ingredients seed count):
-- select
--   (select count(*) from auth.users) as auth_users,
--   (select count(*) from public.profiles) as profiles,
--   (select count(*) from public.family_profiles) as family_profiles,
--   (select count(*) from public.user_avoid_ingredients) as avoid_rows,
--   (select count(*) from public.ingredients) as ingredients;
