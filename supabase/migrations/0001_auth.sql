-- =============================================================================
-- 0001_auth.sql — profiles, auto-provisioning trigger, RLS
--
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Idempotent AND self-healing: it converges an existing `profiles` table to the
-- shape below rather than skipping it. A plain `create table if not exists` is
-- not enough — if the table already exists with different columns it is a
-- silent no-op, and the triggers below then reference columns that aren't
-- there. Safe to run repeatedly.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Shared helper: keep updated_at honest.
-- Defined here because every later migration reuses it.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- profiles — one row per auth user.
--
-- Deliberately holds only public-facing fields. Email lives in auth.users,
-- which is not exposed through the API, so the permissive read policy below
-- cannot leak it.
--
-- Created bare, then each column added separately, so this converges whether
-- the table is new or pre-existing.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles add column if not exists username     text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url   text;
alter table public.profiles add column if not exists bio          text;
alter table public.profiles add column if not exists created_at   timestamptz not null default now();
alter table public.profiles add column if not exists updated_at   timestamptz not null default now();

-- Usernames are unique. An index rather than a table constraint, because
-- `create unique index if not exists` is idempotent and `add constraint` is not.
create unique index if not exists profiles_username_key
  on public.profiles (username);

-- Constraints have no `if not exists`, so drop-then-add is the idempotent form.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (
  -- Lowercase-only, so "Alice" and "alice" can never both be claimed.
  -- Starts with a letter; 3–30 chars; letters, digits, underscore.
  username is null or username ~ '^[a-z][a-z0-9_]{2,29}$'
);

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length check (
  display_name is null or char_length(display_name) <= 60
);

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (
  bio is null or char_length(bio) <= 300
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- Auto-create a profile when an auth user is created.
--
-- `security definer` so it can write to public.profiles regardless of RLS —
-- which is why there is no INSERT policy below; this trigger is the only way a
-- profile row comes into existence.
--
-- `set search_path = ''` is the important bit: without it, a malicious schema
-- earlier on the search path could shadow `profiles` and capture writes made
-- with definer privileges. Everything is therefore schema-qualified.
--
-- Google OAuth supplies full_name/avatar_url in raw_user_meta_data; email
-- signup supplies nothing, so both columns stay null and the user fills them
-- in at /welcome.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- Row level security
--
-- `(select auth.uid())` rather than a bare `auth.uid()` is intentional: the
-- subquery form is evaluated once per statement instead of once per row, which
-- matters a lot on the deck/card tables later. Keeping the habit consistent
-- from the first table.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT policy: profiles are created only by handle_new_user().
-- No DELETE policy: profiles die with their auth.users row via ON DELETE CASCADE,
-- so a user cannot orphan their own account by deleting the profile.


-- -----------------------------------------------------------------------------
-- Backfill: any auth user without a profile row, including the account you
-- just signed up with before this migration was fixed.
-- -----------------------------------------------------------------------------
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  nullif(u.raw_user_meta_data ->> 'full_name', ''),
  nullif(u.raw_user_meta_data ->> 'avatar_url', '')
from auth.users u
on conflict (id) do nothing;
