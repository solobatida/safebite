-- Update nickname source for Google OAuth users (run once in SQL Editor)
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
