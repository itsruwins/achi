-- =============================================================================
-- 0005_ai.sql — daily AI quotas and a generation audit log
--
-- Run after 0004_stats.sql.
--
-- There is no paid tier, so one limit applies to everyone. The numbers live in
-- the application (src/features/ai/limits.ts) and are passed in per call —
-- keeping them out of the schema means changing a limit is a deploy, not a
-- migration.
-- =============================================================================


do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('ai_usage', 'ai_generations')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- ai_usage — one row per user per day.
--
-- Old rows are never read once their day passes; they are kept because they cost
-- nothing and answer "was this account abused, and when".
-- -----------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default current_date,
  primary key (user_id, usage_date)
);

-- An earlier schema called this column `date`. `create table if not exists` is a
-- no-op against the existing table, so without this rename every reference to
-- `usage_date` below fails with "column does not exist".
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ai_usage' and column_name = 'date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ai_usage' and column_name = 'usage_date'
  ) then
    execute 'alter table public.ai_usage rename column "date" to usage_date';
    raise notice 'renamed ai_usage.date to ai_usage.usage_date';
  end if;
end $$;

-- `on conflict (user_id, usage_date)` in consume_ai_quota needs a unique
-- constraint on exactly those columns. The primary key supplies it on a fresh
-- table; this covers a pre-existing table that was keyed differently.
create unique index if not exists ai_usage_user_date_key
  on public.ai_usage (user_id, usage_date);

alter table public.ai_usage add column if not exists generations_used    integer not null default 0;
alter table public.ai_usage add column if not exists tutor_messages_used integer not null default 0;
alter table public.ai_usage add column if not exists updated_at          timestamptz not null default now();

alter table public.ai_usage drop constraint if exists ai_usage_nonnegative;
alter table public.ai_usage add constraint ai_usage_nonnegative check (
  generations_used >= 0 and tutor_messages_used >= 0
);


-- -----------------------------------------------------------------------------
-- ai_generations — audit trail.
--
-- Records the SIZE of the submitted text, never the text. The privacy promise is
-- that prompts are not stored; a column holding them would quietly break that
-- the first time someone pasted something personal into the generator.
-- -----------------------------------------------------------------------------
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid()
);

alter table public.ai_generations add column if not exists user_id         uuid not null references auth.users (id) on delete cascade;
alter table public.ai_generations add column if not exists deck_id         uuid references public.decks (id) on delete set null;
alter table public.ai_generations add column if not exists input_type      text not null default 'topic';
alter table public.ai_generations add column if not exists input_chars     integer not null default 0;
alter table public.ai_generations add column if not exists cards_generated integer not null default 0;
alter table public.ai_generations add column if not exists model           text;
alter table public.ai_generations add column if not exists status          text not null default 'ok';
alter table public.ai_generations add column if not exists created_at      timestamptz not null default now();

create index if not exists ai_generations_user_idx
  on public.ai_generations (user_id, created_at desc);


-- -----------------------------------------------------------------------------
-- Atomic quota consumption.
--
-- Returns the remaining allowance after consuming one unit, or -1 when the
-- caller is already at the limit.
--
-- This has to be one statement. Read-then-write from the application is a race:
-- two requests both read "4 used", both decide 4 < 5, and both proceed — which
-- is precisely the shape an abusive client would exploit. The conditional
-- `where` on the upsert makes the check and the increment a single atomic step.
--
-- `security definer` is load-bearing here, and it is why `ai_usage` has no
-- INSERT or UPDATE policy: this function is the only thing permitted to move the
-- counter. Given a write policy, a client could simply set its own row back to
-- zero and mint unlimited generations. The function takes no user id — it reads
-- auth.uid() itself — so a caller cannot spend someone else's quota either.
-- `set search_path = ''` prevents a shadowing schema from capturing the
-- definer-privileged write, hence the schema-qualified names throughout.
-- -----------------------------------------------------------------------------
create or replace function public.consume_ai_quota(
  quota_kind text,
  daily_limit integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  if quota_kind not in ('generation', 'tutor') then
    raise exception 'unknown quota kind: %', quota_kind;
  end if;

  insert into public.ai_usage (user_id, usage_date, generations_used, tutor_messages_used)
  values (
    (select auth.uid()),
    current_date,
    case when quota_kind = 'generation' then 1 else 0 end,
    case when quota_kind = 'tutor'      then 1 else 0 end
  )
  on conflict (user_id, usage_date) do update
    set generations_used = public.ai_usage.generations_used
                         + (case when quota_kind = 'generation' then 1 else 0 end),
        tutor_messages_used = public.ai_usage.tutor_messages_used
                            + (case when quota_kind = 'tutor' then 1 else 0 end),
        updated_at = now()
    where case
            when quota_kind = 'generation' then public.ai_usage.generations_used
            else public.ai_usage.tutor_messages_used
          end < daily_limit
  returning case
              when quota_kind = 'generation' then generations_used
              else tutor_messages_used
            end
  into used;

  -- No row returned means the conditional update was skipped: already at limit.
  if used is null then
    return -1;
  end if;

  return greatest(daily_limit - used, 0);
end;
$$;


-- Read-only view of today's usage, for showing "3 of 5 left" before the user
-- commits to a generation.
create or replace function public.ai_quota_remaining(
  generation_limit integer,
  tutor_limit integer
)
returns table (generations_left integer, tutor_left integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    greatest(generation_limit - coalesce(u.generations_used, 0), 0),
    greatest(tutor_limit      - coalesce(u.tutor_messages_used, 0), 0)
  from (select 1) dummy
  left join public.ai_usage u
    on u.user_id = (select auth.uid())
   and u.usage_date = current_date;
$$;


-- =============================================================================
-- Row level security
-- =============================================================================
alter table public.ai_usage       enable row level security;
alter table public.ai_generations enable row level security;

-- Read-only to the client. Quota rows are written exclusively by
-- consume_ai_quota() — an UPDATE policy here would let a client reset its own
-- counter to zero and mint unlimited generations.
create policy "read own ai usage"
  on public.ai_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "read own generation history"
  on public.ai_generations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "append own generation history"
  on public.ai_generations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);


revoke all on function public.consume_ai_quota(text, integer)      from public, anon;
revoke all on function public.ai_quota_remaining(integer, integer)  from public, anon;
grant execute on function public.consume_ai_quota(text, integer)     to authenticated;
grant execute on function public.ai_quota_remaining(integer, integer) to authenticated;
