-- =============================================================================
-- 0003_srs.sql — spaced repetition: enrollment, per-card schedule, review log
--
-- Run in the Supabase SQL editor after 0002_decks.sql. Same self-healing style:
-- bare create, then each column added separately, so re-running converges an
-- existing table rather than silently skipping it.
--
-- Note: the column is `interval_days`, not `interval`. `interval` is a reserved
-- word in Postgres (it names a type), so a column called that has to be
-- double-quoted in every single query — one missing pair of quotes and you get
-- a syntax error at runtime.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Clear policies on the tables this migration owns, for the same reason as
-- 0002: policies OR together, so an unknown leftover silently widens access.
-- This file re-creates the complete set at the bottom.
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('deck_enrollments', 'card_srs', 'review_logs')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- deck_enrollments — which decks a user has opted into reviewing.
--
-- A separate table rather than a flag on `decks` because enrollment belongs to
-- the *reader*, not the deck: once shared decks land in Phase 8, several people
-- will review the same deck on their own schedules.
-- -----------------------------------------------------------------------------
create table if not exists public.deck_enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  primary key (user_id, deck_id)
);

alter table public.deck_enrollments
  add column if not exists enrolled_at timestamptz not null default now();

create index if not exists deck_enrollments_user_idx
  on public.deck_enrollments (user_id);


-- -----------------------------------------------------------------------------
-- card_srs — scheduling state, one row per user per card.
--
-- Keyed by (user_id, card_id) so two people studying the same shared deck keep
-- independent schedules. `deck_id` is denormalized so "cards due in this deck"
-- and the topic filter don't need a join back through `cards`.
-- -----------------------------------------------------------------------------
create table if not exists public.card_srs (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  primary key (user_id, card_id)
);

alter table public.card_srs add column if not exists deck_id          uuid not null references public.decks (id) on delete cascade;
alter table public.card_srs add column if not exists interval_days    integer not null default 1;
alter table public.card_srs add column if not exists ease_factor      numeric(4,2) not null default 2.5;
alter table public.card_srs add column if not exists repetitions      integer not null default 0;
alter table public.card_srs add column if not exists lapses           integer not null default 0;
alter table public.card_srs add column if not exists due_date         date not null default current_date;
alter table public.card_srs add column if not exists last_rating      text;
alter table public.card_srs add column if not exists last_reviewed_at timestamptz;
alter table public.card_srs add column if not exists created_at       timestamptz not null default now();
alter table public.card_srs add column if not exists updated_at       timestamptz not null default now();

-- Bounds that mirror the algorithm in src/features/srs/algorithm.ts. These are
-- a backstop, not the source of truth: if a scheduling bug ever writes garbage,
-- the write fails loudly here instead of quietly corrupting someone's queue.
alter table public.card_srs drop constraint if exists card_srs_interval_range;
alter table public.card_srs add constraint card_srs_interval_range check (
  interval_days between 1 and 3650
);

alter table public.card_srs drop constraint if exists card_srs_ease_range;
alter table public.card_srs add constraint card_srs_ease_range check (
  ease_factor between 1.3 and 3.0
);

alter table public.card_srs drop constraint if exists card_srs_counts_nonnegative;
alter table public.card_srs add constraint card_srs_counts_nonnegative check (
  repetitions >= 0 and lapses >= 0
);

-- Guarded the same way as decks.visibility in 0002: only constrain the column
-- if it is text. If a previous schema made it an enum, leave that alone.
do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'card_srs' and column_name = 'last_rating'
  ) = 'text' then
    execute 'alter table public.card_srs drop constraint if exists card_srs_last_rating_valid';
    execute 'alter table public.card_srs add constraint card_srs_last_rating_valid check '
         || '(last_rating is null or last_rating in (''again'', ''hard'', ''good'', ''easy''))';
  end if;
end $$;

-- The review queue is exactly this index: one user, everything due by today.
create index if not exists card_srs_due_idx
  on public.card_srs (user_id, due_date);

create index if not exists card_srs_deck_idx
  on public.card_srs (user_id, deck_id);

drop trigger if exists card_srs_set_updated_at on public.card_srs;
create trigger card_srs_set_updated_at
  before update on public.card_srs
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- review_logs — append-only record of every rating.
--
-- card_srs holds only the current state, which cannot answer "how did I do last
-- week". Phase 5's accuracy figures, activity chart, and struggling-cards list
-- all read from here.
--
-- ON DELETE CASCADE from cards: history for a card that no longer exists cannot
-- be displayed anyway, and keeping it would leave rows pointing at nothing.
-- -----------------------------------------------------------------------------
create table if not exists public.review_logs (
  id bigint generated always as identity primary key
);

alter table public.review_logs add column if not exists user_id        uuid not null references auth.users (id) on delete cascade;
alter table public.review_logs add column if not exists card_id        uuid not null references public.cards (id) on delete cascade;
alter table public.review_logs add column if not exists deck_id        uuid references public.decks (id) on delete set null;
alter table public.review_logs add column if not exists rating         text not null;
alter table public.review_logs add column if not exists interval_after integer;
alter table public.review_logs add column if not exists reviewed_at    timestamptz not null default now();

do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'review_logs' and column_name = 'rating'
  ) = 'text' then
    execute 'alter table public.review_logs drop constraint if exists review_logs_rating_valid';
    execute 'alter table public.review_logs add constraint review_logs_rating_valid check '
         || '(rating in (''again'', ''hard'', ''good'', ''easy''))';
  end if;
end $$;

create index if not exists review_logs_user_time_idx
  on public.review_logs (user_id, reviewed_at desc);


-- =============================================================================
-- Row level security — all three tables are strictly per-user.
-- =============================================================================
alter table public.deck_enrollments enable row level security;
alter table public.card_srs         enable row level security;
alter table public.review_logs      enable row level security;

create policy "own enrollments"
  on public.deck_enrollments
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own srs state"
  on public.card_srs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Insert and read only. Review history is an audit trail; letting the client
-- rewrite it would make every statistic in Phase 5 unfalsifiable.
create policy "read own review history"
  on public.review_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "append own review history"
  on public.review_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
