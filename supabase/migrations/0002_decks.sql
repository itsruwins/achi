-- =============================================================================
-- 0002_decks.sql — folders, decks, cards, card images
--
-- Run in the Supabase SQL editor after 0001_auth.sql. Idempotent and
-- self-healing, same as 0001: bare `create table if not exists`, then each
-- column added separately, so re-running converges an existing table instead
-- of silently skipping it.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- folders — optional grouping for decks (by subject, semester, whatever).
-- -----------------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid()
);

alter table public.folders add column if not exists user_id    uuid not null references auth.users (id) on delete cascade;
alter table public.folders add column if not exists name       text not null default 'Untitled folder';
alter table public.folders add column if not exists color      text;
alter table public.folders add column if not exists sort_order integer not null default 0;
alter table public.folders add column if not exists created_at timestamptz not null default now();
alter table public.folders add column if not exists updated_at timestamptz not null default now();

alter table public.folders drop constraint if exists folders_name_length;
alter table public.folders add constraint folders_name_length check (
  char_length(name) between 1 and 60
);

-- One folder name per user. Two "Biology" folders is a bug, not a feature.
create unique index if not exists folders_user_name_key
  on public.folders (user_id, lower(name));

create index if not exists folders_user_idx
  on public.folders (user_id, sort_order, created_at);

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- decks
--
-- `card_count` is denormalized and maintained by trigger. Counting cards on
-- every grid render is a query per deck; this makes the deck list one query.
--
-- `origin_deck_id` records lineage when a deck is duplicated or imported from
-- someone else's public deck. ON DELETE SET NULL so deleting the original does
-- not cascade into copies people made.
-- -----------------------------------------------------------------------------
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid()
);

alter table public.decks add column if not exists user_id        uuid not null references auth.users (id) on delete cascade;
alter table public.decks add column if not exists folder_id      uuid references public.folders (id) on delete set null;
alter table public.decks add column if not exists title          text not null default 'Untitled deck';
alter table public.decks add column if not exists description    text;
alter table public.decks add column if not exists emoji          text;
alter table public.decks add column if not exists visibility     text not null default 'private';
alter table public.decks add column if not exists source         text not null default 'manual';
alter table public.decks add column if not exists origin_deck_id uuid references public.decks (id) on delete set null;
alter table public.decks add column if not exists is_pinned      boolean not null default false;
alter table public.decks add column if not exists card_count     integer not null default 0;
alter table public.decks add column if not exists created_at     timestamptz not null default now();
alter table public.decks add column if not exists updated_at     timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- Clear existing policies on the three tables this migration owns.
--
-- Two reasons. First, Postgres refuses to change a column's type while any
-- policy references it ("cannot alter type of a column used in a policy
-- definition"), and the conversion below touches `visibility`. Second, this
-- database already carries policies from an earlier schema under names this
-- migration doesn't know — leaving them in place would silently OR extra
-- access on top of the rules defined at the bottom of this file, which is
-- exactly the kind of drift that makes RLS impossible to reason about.
--
-- Safe because this migration re-creates the full policy set for these three
-- tables. `profiles` is deliberately excluded: its policies come from 0001 and
-- nothing here would put them back.
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('decks', 'cards', 'folders')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
    raise notice 'dropped policy % on %', pol.policyname, pol.tablename;
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- `visibility` and `source`: work with whatever type the column already has.
--
-- A fresh database gets text + CHECK, which is the preferred shape — a CHECK is
-- edited in place, whereas widening an enum needs ALTER TYPE and the new value
-- cannot be used in the same transaction that adds it.
--
-- This database already has them as enums (deck_visibility, deck_source), and
-- converting is not worth it: Postgres rebuilds every dependent object on a
-- type change, so each policy, partial index, and constraint embedding an enum
-- literal has to be dropped and restored first. That trades a working column
-- for a migration that breaks on whatever dependency turns up next. Instead,
-- widen the enum to hold the values the app uses and skip the CHECK — the enum
-- is already the constraint.
--
-- Nothing else in the app cares: PostgREST casts the strings it sends to the
-- column type either way.
-- -----------------------------------------------------------------------------
do $$
declare
  is_enum_visibility boolean;
  is_enum_source     boolean;
  value              text;
begin
  select data_type = 'USER-DEFINED' into is_enum_visibility
  from information_schema.columns
  where table_schema = 'public' and table_name = 'decks' and column_name = 'visibility';

  select data_type = 'USER-DEFINED' into is_enum_source
  from information_schema.columns
  where table_schema = 'public' and table_name = 'decks' and column_name = 'source';

  if is_enum_visibility then
    foreach value in array array['private', 'unlisted', 'public'] loop
      execute format('alter type public.deck_visibility add value if not exists %L', value);
    end loop;
    raise notice 'decks.visibility left as enum deck_visibility; values ensured';
  else
    -- Text column: normalize stray values, then constrain.
    update public.decks set visibility = 'private'
     where visibility is null or visibility not in ('private', 'unlisted', 'public');

    execute 'alter table public.decks drop constraint if exists decks_visibility_valid';
    execute 'alter table public.decks add constraint decks_visibility_valid check '
         || '(visibility in (''private'', ''unlisted'', ''public''))';
  end if;

  if is_enum_source then
    foreach value in array array['manual', 'ai', 'import', 'duplicate'] loop
      execute format('alter type public.deck_source add value if not exists %L', value);
    end loop;
    raise notice 'decks.source left as enum deck_source; values ensured';
  else
    update public.decks set source = 'manual'
     where source is null or source not in ('manual', 'ai', 'import', 'duplicate');

    execute 'alter table public.decks drop constraint if exists decks_source_valid';
    execute 'alter table public.decks add constraint decks_source_valid check '
         || '(source in (''manual'', ''ai'', ''import'', ''duplicate''))';
  end if;
end $$;

alter table public.decks drop constraint if exists decks_title_length;
alter table public.decks add constraint decks_title_length check (
  char_length(title) between 1 and 120
);

alter table public.decks drop constraint if exists decks_description_length;
alter table public.decks add constraint decks_description_length check (
  description is null or char_length(description) <= 500
);

-- The deck grid is ordered pinned-first, then most-recently-touched.
create index if not exists decks_user_updated_idx
  on public.decks (user_id, is_pinned desc, updated_at desc);

create index if not exists decks_folder_idx
  on public.decks (folder_id) where folder_id is not null;

-- Partial index: discovery in Phase 8 only ever scans shared decks.
create index if not exists decks_public_idx
  on public.decks (updated_at desc) where visibility <> 'private';

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- cards
--
-- `category` is free text, not a lookup table — the distinct set is derived at
-- read time. A card belongs to exactly one deck and dies with it.
-- -----------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid()
);

alter table public.cards add column if not exists deck_id          uuid not null references public.decks (id) on delete cascade;
alter table public.cards add column if not exists front            text not null default '';
alter table public.cards add column if not exists back             text not null default '';
alter table public.cards add column if not exists front_image_url  text;
alter table public.cards add column if not exists back_image_url   text;
alter table public.cards add column if not exists category         text;
alter table public.cards add column if not exists hint             text;
alter table public.cards add column if not exists position         integer not null default 0;
alter table public.cards add column if not exists created_at       timestamptz not null default now();
alter table public.cards add column if not exists updated_at       timestamptz not null default now();

alter table public.cards drop constraint if exists cards_front_length;
alter table public.cards add constraint cards_front_length check (
  char_length(front) <= 2000
);

alter table public.cards drop constraint if exists cards_back_length;
alter table public.cards add constraint cards_back_length check (
  char_length(back) <= 2000
);

alter table public.cards drop constraint if exists cards_category_length;
alter table public.cards add constraint cards_category_length check (
  category is null or char_length(category) <= 40
);

-- A card with no text on either side and no image is an empty row, not a card.
alter table public.cards drop constraint if exists cards_not_empty;
alter table public.cards add constraint cards_not_empty check (
  char_length(trim(front)) > 0
  or char_length(trim(back)) > 0
  or front_image_url is not null
  or back_image_url is not null
);

create index if not exists cards_deck_position_idx
  on public.cards (deck_id, position, created_at);

create index if not exists cards_deck_category_idx
  on public.cards (deck_id, category) where category is not null;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- Keep decks.card_count in sync.
--
-- Recomputes rather than incrementing: an increment drifts permanently the
-- first time anything writes cards outside the app (a bulk import, a manual
-- fix in the SQL editor), and a wrong count is invisible until someone
-- notices the number doesn't match the list.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_deck_card_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid;
begin
  foreach affected in array (
    case
      when tg_op = 'INSERT' then array[new.deck_id]
      when tg_op = 'DELETE' then array[old.deck_id]
      -- A card moved between decks: both counts change.
      else array[new.deck_id, old.deck_id]
    end
  )
  loop
    update public.decks d
       set card_count = (select count(*) from public.cards c where c.deck_id = d.id)
     where d.id = affected;
  end loop;

  return null;
end;
$$;

drop trigger if exists cards_refresh_deck_count on public.cards;
create trigger cards_refresh_deck_count
  after insert or delete or update of deck_id on public.cards
  for each row execute function public.refresh_deck_card_count();

-- Correct any counts that drifted before this trigger existed.
update public.decks d
   set card_count = (select count(*) from public.cards c where c.deck_id = d.id)
 where d.card_count is distinct from (select count(*) from public.cards c where c.deck_id = d.id);


-- =============================================================================
-- Row level security
-- =============================================================================

-- folders — private, no sharing story.
alter table public.folders enable row level security;

drop policy if exists "own folders" on public.folders;
create policy "own folders"
  on public.folders
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


-- decks — owner does anything; everyone can read shared decks.
alter table public.decks enable row level security;

drop policy if exists "own decks" on public.decks;
create policy "own decks"
  on public.decks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Separate SELECT policy. Policies OR together, so an owner reading their own
-- private deck still matches "own decks" above.
drop policy if exists "shared decks are readable" on public.decks;
create policy "shared decks are readable"
  on public.decks
  for select
  using (visibility <> 'private');


-- cards — access follows the parent deck.
alter table public.cards enable row level security;

drop policy if exists "own cards" on public.cards;
create policy "own cards"
  on public.cards
  for all
  to authenticated
  using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "cards in shared decks are readable" on public.cards;
create policy "cards in shared decks are readable"
  on public.cards
  for select
  using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.visibility <> 'private'
    )
  );


-- =============================================================================
-- Storage: card images
--
-- Public bucket, because cards render images with a plain <img> and signed URLs
-- would expire mid-session. That means anyone holding the URL can view the
-- file — the URL is the only secret. Writes are still locked to the owner:
-- every object must live under a folder named after the uploader's user id.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  5242880,  -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "card images are publicly readable" on storage.objects;
create policy "card images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'card-images');

drop policy if exists "users upload their own card images" on storage.objects;
create policy "users upload their own card images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'card-images'
    -- First path segment must be the uploader's own user id, so nobody can
    -- write into (or overwrite) another user's folder.
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete their own card images" on storage.objects;
create policy "users delete their own card images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
