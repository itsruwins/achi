-- =============================================================================
-- 0004_stats.sql — aggregate functions for the stats dashboard
--
-- Run after 0003_srs.sql. No new tables: `review_logs` and `card_srs` already
-- hold everything the dashboard shows.
--
-- A `daily_stats` rollup was the obvious alternative, and it is the wrong trade
-- here. It would be a second copy of numbers that already exist, kept in sync by
-- application code — and a counter that drifts is invisible until someone
-- notices their streak is wrong, by which point the true value is unrecoverable.
-- Aggregating on read is exact by construction. These functions exist so that
-- aggregation happens in Postgres over an index rather than by shipping every
-- review row to the server and counting them in JavaScript.
--
-- All three are `security invoker` and `stable`: they run as the calling user,
-- so row level security applies normally and each one sees only its own rows.
-- The explicit `user_id = auth.uid()` filter is on top of that, so the planner
-- uses the per-user indexes instead of relying on the policy predicate alone.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Reviews per day, for the activity chart, accuracy, and streaks.
--
-- "Correct" is any rating other than `again` — `again` is the one that means
-- the answer didn't come. Counting `hard` as incorrect would punish honesty,
-- and people would stop using the button.
-- -----------------------------------------------------------------------------
create or replace function public.review_daily_counts(since_date date)
returns table (day date, reviewed bigint, correct bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (r.reviewed_at at time zone 'UTC')::date as day,
    count(*)                                  as reviewed,
    count(*) filter (where r.rating <> 'again') as correct
  from public.review_logs r
  where r.user_id = (select auth.uid())
    and r.reviewed_at >= since_date
  group by 1
  order by 1;
$$;


-- -----------------------------------------------------------------------------
-- How many cards come due over the next N days.
--
-- Overdue cards are folded into today via `greatest(...)`: they are due *now*,
-- and a forecast that shows them in the past is not telling you anything you
-- can act on.
-- -----------------------------------------------------------------------------
create or replace function public.due_forecast(days_ahead integer)
returns table (due_on date, cards bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    greatest(s.due_date, current_date) as due_on,
    count(*)                           as cards
  from public.card_srs s
  where s.user_id = (select auth.uid())
    and s.due_date <= (current_date + days_ahead)
  group by 1
  order by 1;
$$;


-- -----------------------------------------------------------------------------
-- Card maturity distribution.
--
-- The thresholds mirror `maturity()` in src/features/srs/algorithm.ts. They are
-- duplicated deliberately — the alternative is fetching every schedule row to
-- bucket it in JavaScript. If one changes, change the other.
-- -----------------------------------------------------------------------------
create or replace function public.card_maturity_counts()
returns table (bucket text, cards bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    case
      when s.repetitions = 0     then 'new'
      when s.interval_days < 7   then 'learning'
      when s.interval_days < 21  then 'young'
      else                            'mature'
    end      as bucket,
    count(*) as cards
  from public.card_srs s
  where s.user_id = (select auth.uid())
  group by 1;
$$;


-- -----------------------------------------------------------------------------
-- Only signed-in users may call these. `anon` is not granted execute, so an
-- unauthenticated caller cannot reach them at all — and with auth.uid() null it
-- would get an empty result even if it did.
-- -----------------------------------------------------------------------------
revoke all on function public.review_daily_counts(date)     from public, anon;
revoke all on function public.due_forecast(integer)         from public, anon;
revoke all on function public.card_maturity_counts()        from public, anon;

grant execute on function public.review_daily_counts(date)  to authenticated;
grant execute on function public.due_forecast(integer)      to authenticated;
grant execute on function public.card_maturity_counts()     to authenticated;
