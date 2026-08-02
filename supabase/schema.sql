-- SafeBite Supabase schema (run in SQL Editor after creating a project)

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  account_nickname text not null default '',
  ui_language text not null default 'en',
  created_at timestamptz not null default now()
);

-- One row per person (child, partner, self) under a household account
create table if not exists public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id text primary key,
  category text not null,
  labels jsonb not null default '{}',
  aliases text[] not null default '{}',
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected'))
);

create table if not exists public.user_avoid_ingredients (
  id uuid primary key default gen_random_uuid(),
  family_profile_id uuid not null references public.family_profiles(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (family_profile_id, ingredient_id)
);

create table if not exists public.ingredient_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  proposed_labels jsonb not null,
  category text not null default 'other',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.family_profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.user_avoid_ingredients enable row level security;
alter table public.ingredient_submissions enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "family_profiles_select_own" on public.family_profiles
  for select using (account_id = auth.uid());

create policy "family_profiles_insert_own" on public.family_profiles
  for insert with check (account_id = auth.uid());

create policy "family_profiles_update_own" on public.family_profiles
  for update using (account_id = auth.uid());

create policy "family_profiles_delete_own" on public.family_profiles
  for delete using (account_id = auth.uid());

create policy "ingredients_read_approved" on public.ingredients
  for select using (status = 'approved');

create policy "avoid_select_own" on public.user_avoid_ingredients
  for select using (
    exists (
      select 1 from public.family_profiles fp
      where fp.id = family_profile_id and fp.account_id = auth.uid()
    )
  );

create policy "avoid_insert_own" on public.user_avoid_ingredients
  for insert with check (
    exists (
      select 1 from public.family_profiles fp
      where fp.id = family_profile_id and fp.account_id = auth.uid()
    )
  );

create policy "avoid_delete_own" on public.user_avoid_ingredients
  for delete using (
    exists (
      select 1 from public.family_profiles fp
      where fp.id = family_profile_id and fp.account_id = auth.uid()
    )
  );

create policy "submissions_insert_own" on public.ingredient_submissions
  for insert with check (account_id = auth.uid());

create policy "submissions_select_own" on public.ingredient_submissions
  for select using (account_id = auth.uid());

-- Auto-create profile + default family profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nickname text;
begin
  nickname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'account_nickname'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, account_nickname)
  values (new.id, new.email, nickname);

  insert into public.family_profiles (account_id, display_name)
  values (new.id, nickname);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
