-- Admin views: users + their avoid lists (run in Supabase SQL Editor)
-- Visible in Table Editor under "Views" after running this file.
-- Intended for dashboard inspection (service role / SQL Editor), not for the mobile app.

-- One row per ingredient avoided (detalle)
create or replace view public.admin_user_avoid_list as
select
  p.id as account_id,
  p.email,
  p.account_nickname,
  p.ui_language,
  fp.id as family_profile_id,
  fp.display_name as profile_name,
  uai.ingredient_id,
  coalesce(i.labels->>'es', i.labels->>'en', uai.ingredient_id) as ingredient_label,
  i.category as ingredient_category,
  uai.created_at as avoided_at
from public.profiles p
join public.family_profiles fp on fp.account_id = p.id
join public.user_avoid_ingredients uai on uai.family_profile_id = fp.id
left join public.ingredients i on i.id = uai.ingredient_id
order by p.email, fp.display_name, ingredient_label;

-- One row per account with the full list (resumen)
create or replace view public.admin_user_avoid_summary as
select
  p.id as account_id,
  p.email,
  p.account_nickname,
  p.ui_language,
  fp.id as family_profile_id,
  fp.display_name as profile_name,
  count(uai.ingredient_id)::int as avoid_count,
  coalesce(
    string_agg(
      coalesce(i.labels->>'es', i.labels->>'en', uai.ingredient_id),
      ', ' order by coalesce(i.labels->>'es', i.labels->>'en', uai.ingredient_id)
    ),
    ''
  ) as ingredients
from public.profiles p
join public.family_profiles fp on fp.account_id = p.id
left join public.user_avoid_ingredients uai on uai.family_profile_id = fp.id
left join public.ingredients i on i.id = uai.ingredient_id
group by p.id, p.email, p.account_nickname, p.ui_language, fp.id, fp.display_name
order by p.email, fp.display_name;

-- Keep these admin-only (app users should not read other accounts via views)
revoke all on public.admin_user_avoid_list from anon, authenticated;
revoke all on public.admin_user_avoid_summary from anon, authenticated;
