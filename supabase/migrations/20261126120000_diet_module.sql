-- Moduł Dieta: profil żywieniowy, własne produkty, wspólny cache Open Food Facts, wpisy dnia.

create table if not exists public.diet_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  age integer not null check (age between 13 and 100),
  height_cm numeric(5, 1) not null check (height_cm between 120 and 230),
  weight_kg numeric(5, 1) not null check (weight_kg between 30 and 300),
  activity text not null check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text not null check (goal in ('cut', 'maintain', 'bulk')),
  -- Opcjonalne ręczne cele (nadpisują wyliczone).
  kcal_target integer check (kcal_target between 800 and 7000),
  protein_target integer check (protein_target between 0 and 500),
  carbs_target integer check (carbs_target between 0 and 1000),
  fat_target integer check (fat_target between 0 and 400),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  barcode text check (barcode ~ '^[0-9]{6,14}$'),
  kcal_100 numeric(7, 2) not null check (kcal_100 between 0 and 1000),
  protein_100 numeric(6, 2) not null default 0 check (protein_100 between 0 and 100),
  carbs_100 numeric(6, 2) not null default 0 check (carbs_100 between 0 and 100),
  fat_100 numeric(6, 2) not null default 0 check (fat_100 between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists custom_foods_user_name_idx on public.custom_foods (user_id, lower(name));

-- Wspólny cache produktów z Open Food Facts (publiczne dane) – po kodzie kreskowym.
create table if not exists public.food_cache (
  barcode text primary key check (barcode ~ '^[0-9]{6,14}$'),
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  kcal_100 numeric(7, 2) not null check (kcal_100 between 0 and 1000),
  protein_100 numeric(6, 2) not null default 0,
  carbs_100 numeric(6, 2) not null default 0,
  fat_100 numeric(6, 2) not null default 0,
  image_url text,
  source text not null default 'off' check (source = 'off'),
  fetched_at timestamptz not null default now()
);

create table if not exists public.diet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  eaten_on date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null check (char_length(food_name) between 1 and 200),
  brand text,
  source text not null check (source in ('off', 'custom')),
  source_id text,
  grams numeric(7, 1) not null check (grams > 0 and grams <= 5000),
  -- Wartości zapisane w chwili dodania (produkt w bazie może się później zmienić).
  kcal numeric(8, 1) not null check (kcal >= 0),
  protein numeric(7, 1) not null default 0 check (protein >= 0),
  carbs numeric(7, 1) not null default 0 check (carbs >= 0),
  fat numeric(7, 1) not null default 0 check (fat >= 0),
  created_at timestamptz not null default now()
);
create index if not exists diet_entries_user_day_idx on public.diet_entries (user_id, eaten_on);

alter table public.diet_profiles enable row level security;
alter table public.custom_foods enable row level security;
alter table public.food_cache enable row level security;
alter table public.diet_entries enable row level security;

grant select, insert, update on table public.diet_profiles to authenticated;
grant select, insert, delete on table public.custom_foods to authenticated;
grant select, insert, update on table public.food_cache to authenticated;
grant select, insert, update, delete on table public.diet_entries to authenticated;

drop policy if exists "Own diet profile" on public.diet_profiles;
create policy "Own diet profile" on public.diet_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own custom foods" on public.custom_foods;
create policy "Own custom foods" on public.custom_foods for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Read food cache" on public.food_cache;
create policy "Read food cache" on public.food_cache for select to authenticated using (true);
drop policy if exists "Fill food cache" on public.food_cache;
create policy "Fill food cache" on public.food_cache for insert to authenticated with check (true);
drop policy if exists "Refresh food cache" on public.food_cache;
create policy "Refresh food cache" on public.food_cache for update to authenticated using (true) with check (true);

drop policy if exists "Own diet entries" on public.diet_entries;
create policy "Own diet entries" on public.diet_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
