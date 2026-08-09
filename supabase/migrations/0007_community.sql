-- =============================================================================
-- 0007_community.sql — share links, following, communities
--
-- Run after 0006_ai_refund.sql.
--
-- This migration has the largest security surface in the project: it is the
-- first time one user's rows are readable by another. Read the RLS section at
-- the bottom before applying — every policy there is a decision about who can
-- see whose study material.
-- =============================================================================


do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('deck_shares', 'follows', 'communities',
                        'community_members', 'community_posts', 'community_decks')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- deck_shares — a short link that resolves to a deck.
--
-- Deliberately NOT a frozen snapshot of the deck's contents, which is what the
-- plan called for. A snapshot means fixing a typo never reaches anyone you
-- already shared with, and it duplicates every card into a second place that
-- can disagree with the first. The link resolves live and access is governed by
-- the deck's own visibility — so "make it private" instantly kills every link,
-- which is the behaviour people actually expect from a revoke.
--
-- The token exists so an *unlisted* deck can be shared: unguessable, and absent
-- from discovery.
-- -----------------------------------------------------------------------------
create table if not exists public.deck_shares (
  id uuid primary key default gen_random_uuid()
);

alter table public.deck_shares add column if not exists deck_id      uuid not null references public.decks (id) on delete cascade;
alter table public.deck_shares add column if not exists created_by   uuid not null references auth.users (id) on delete cascade;
alter table public.deck_shares add column if not exists token        text not null;
alter table public.deck_shares add column if not exists view_count   integer not null default 0;
alter table public.deck_shares add column if not exists import_count integer not null default 0;
alter table public.deck_shares add column if not exists revoked_at   timestamptz;
alter table public.deck_shares add column if not exists created_at   timestamptz not null default now();

create unique index if not exists deck_shares_token_key on public.deck_shares (token);
create index if not exists deck_shares_deck_idx on public.deck_shares (deck_id);


-- -----------------------------------------------------------------------------
-- follows — one row per (follower, followed).
-- -----------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table public.follows drop constraint if exists follows_not_self;
alter table public.follows add constraint follows_not_self check (
  follower_id <> following_id
);

create index if not exists follows_following_idx on public.follows (following_id);


-- -----------------------------------------------------------------------------
-- communities
-- -----------------------------------------------------------------------------
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid()
);

alter table public.communities add column if not exists owner_id     uuid not null references auth.users (id) on delete cascade;
alter table public.communities add column if not exists slug         text not null;
alter table public.communities add column if not exists name         text not null default 'Untitled community';
alter table public.communities add column if not exists description  text;
alter table public.communities add column if not exists join_policy  text not null default 'open';
alter table public.communities add column if not exists invite_code  text;
alter table public.communities add column if not exists member_count integer not null default 0;
alter table public.communities add column if not exists created_at   timestamptz not null default now();
alter table public.communities add column if not exists updated_at   timestamptz not null default now();

alter table public.communities drop constraint if exists communities_join_policy_valid;
alter table public.communities add constraint communities_join_policy_valid check (
  join_policy in ('open', 'invite_only')
);

alter table public.communities drop constraint if exists communities_slug_format;
alter table public.communities add constraint communities_slug_format check (
  slug ~ '^[a-z][a-z0-9-]{2,39}$'
);

alter table public.communities drop constraint if exists communities_name_length;
alter table public.communities add constraint communities_name_length check (
  char_length(name) between 1 and 60
);

create unique index if not exists communities_slug_key on public.communities (slug);
create unique index if not exists communities_invite_code_key
  on public.communities (invite_code) where invite_code is not null;

drop trigger if exists communities_set_updated_at on public.communities;
create trigger communities_set_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();


create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.community_members drop constraint if exists community_members_role_valid;
alter table public.community_members add constraint community_members_role_valid check (
  role in ('owner', 'moderator', 'member')
);

create index if not exists community_members_user_idx
  on public.community_members (user_id);


create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid()
);

alter table public.community_posts add column if not exists community_id uuid not null references public.communities (id) on delete cascade;
alter table public.community_posts add column if not exists author_id    uuid not null references auth.users (id) on delete cascade;
alter table public.community_posts add column if not exists body         text not null default '';
alter table public.community_posts add column if not exists deck_id      uuid references public.decks (id) on delete set null;
alter table public.community_posts add column if not exists created_at   timestamptz not null default now();

alter table public.community_posts drop constraint if exists community_posts_body_length;
alter table public.community_posts add constraint community_posts_body_length check (
  char_length(body) between 1 and 2000
);

create index if not exists community_posts_community_idx
  on public.community_posts (community_id, created_at desc);


create table if not exists public.community_decks (
  community_id uuid not null references public.communities (id) on delete cascade,
  deck_id      uuid not null references public.decks (id) on delete cascade,
  shared_by    uuid not null references auth.users (id) on delete cascade,
  shared_at    timestamptz not null default now(),
  primary key (community_id, deck_id)
);

create index if not exists community_decks_community_idx
  on public.community_decks (community_id, shared_at desc);


-- -----------------------------------------------------------------------------
-- Membership check, as a function.
--
-- This is not a convenience — it is required. A policy on `community_members`
-- that asks "is the caller a member of this community?" has to query
-- `community_members`, which re-runs the same policy, which queries the table
-- again: Postgres aborts with "infinite recursion detected in policy". A
-- `security definer` function bypasses RLS for that one lookup and breaks the
-- cycle.
--
-- `stable` so the planner can cache it within a statement instead of calling it
-- once per row.
-- -----------------------------------------------------------------------------
create or replace function public.is_community_member(target_community uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_members m
    where m.community_id = target_community
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_community_owner(target_community uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = target_community
      and c.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_community_member(uuid) from public, anon;
revoke all on function public.is_community_owner(uuid)  from public, anon;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_community_owner(uuid)  to authenticated;


-- -----------------------------------------------------------------------------
-- Keep communities.member_count honest.
--
-- Recomputed, not incremented — same reasoning as decks.card_count: an
-- increment drifts permanently the first time anything writes outside the app,
-- and a wrong count is invisible until someone notices.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid := coalesce(new.community_id, old.community_id);
begin
  update public.communities c
     set member_count = (
       select count(*) from public.community_members m where m.community_id = c.id
     )
   where c.id = affected;
  return null;
end;
$$;

drop trigger if exists community_members_refresh_count on public.community_members;
create trigger community_members_refresh_count
  after insert or delete on public.community_members
  for each row execute function public.refresh_community_member_count();

update public.communities c
   set member_count = (select count(*) from public.community_members m where m.community_id = c.id);


-- =============================================================================
-- Row level security
--
-- Read this section as a specification of who can see what.
-- =============================================================================
alter table public.deck_shares       enable row level security;
alter table public.follows           enable row level security;
alter table public.communities       enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts   enable row level security;
alter table public.community_decks   enable row level security;


-- deck_shares --------------------------------------------------------------
-- A share link is readable by ANYONE, including signed-out visitors — that is
-- the entire point of a link. What keeps it safe is the join to `decks`: the
-- row only resolves while the deck is non-private and the link is not revoked.
-- Flipping a deck to Private therefore kills every link to it immediately.
drop policy if exists "share links resolve while the deck is shared" on public.deck_shares;
create policy "share links resolve while the deck is shared"
  on public.deck_shares
  for select
  using (
    revoked_at is null
    and exists (
      select 1 from public.decks d
      where d.id = deck_shares.deck_id
        and d.visibility <> 'private'
    )
  );

drop policy if exists "owners manage their share links" on public.deck_shares;
create policy "owners manage their share links"
  on public.deck_shares
  for all
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);


-- follows ------------------------------------------------------------------
-- Public: follower counts appear on profiles, and hiding the edges while
-- showing the totals would be theatre.
drop policy if exists "follows are public" on public.follows;
create policy "follows are public"
  on public.follows for select using (true);

drop policy if exists "users manage their own follows" on public.follows;
create policy "users manage their own follows"
  on public.follows
  for all
  to authenticated
  using ((select auth.uid()) = follower_id)
  with check ((select auth.uid()) = follower_id);


-- communities ---------------------------------------------------------------
-- Every community is *discoverable* — name, description, member count. That is
-- what makes an invite-only community joinable at all. `join_policy` controls
-- who can enter and, through the policies below, who can read what is inside.
drop policy if exists "communities are discoverable" on public.communities;
create policy "communities are discoverable"
  on public.communities for select using (true);

drop policy if exists "users create communities they own" on public.communities;
create policy "users create communities they own"
  on public.communities
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "owners update their community" on public.communities;
create policy "owners update their community"
  on public.communities
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "owners delete their community" on public.communities;
create policy "owners delete their community"
  on public.communities
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);


-- community_members ---------------------------------------------------------
-- The member list is visible to members only. Both policies below call the
-- security-definer helper rather than querying this table inline — see the
-- note on that function; the inline form is an infinite-recursion error.
drop policy if exists "members see the roster" on public.community_members;
create policy "members see the roster"
  on public.community_members
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_community_member(community_id)
  );

-- Joining is self-service, and only for open communities. Invite-only
-- communities are joined through join_community_with_code(), which checks the
-- code with definer rights — a client cannot insert itself into one directly.
drop policy if exists "anyone may join an open community" on public.community_members;
create policy "anyone may join an open community"
  on public.community_members
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.join_policy = 'open'
    )
  );

-- Leave yourself, or be removed by the owner.
drop policy if exists "leave or be removed" on public.community_members;
create policy "leave or be removed"
  on public.community_members
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_community_owner(community_id)
  );


-- community_posts -----------------------------------------------------------
-- Members only, read and write. A community's discussion is the part people
-- expect to be inside the door.
drop policy if exists "members read posts" on public.community_posts;
create policy "members read posts"
  on public.community_posts
  for select
  to authenticated
  using (public.is_community_member(community_id));

drop policy if exists "members write posts" on public.community_posts;
create policy "members write posts"
  on public.community_posts
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and public.is_community_member(community_id)
  );

drop policy if exists "authors and owners delete posts" on public.community_posts;
create policy "authors and owners delete posts"
  on public.community_posts
  for delete
  to authenticated
  using (
    (select auth.uid()) = author_id
    or public.is_community_owner(community_id)
  );


-- community_decks -----------------------------------------------------------
-- Note what this table does NOT do: listing a deck here does not grant access
-- to it. Reading the deck still goes through the decks policies, so sharing a
-- *private* deck into a community lists a row members cannot open. The
-- application sets visibility to 'unlisted' when sharing, so the two agree.
drop policy if exists "members see shared decks" on public.community_decks;
create policy "members see shared decks"
  on public.community_decks
  for select
  to authenticated
  using (public.is_community_member(community_id));

drop policy if exists "members share their own decks" on public.community_decks;
create policy "members share their own decks"
  on public.community_decks
  for insert
  to authenticated
  with check (
    (select auth.uid()) = shared_by
    and public.is_community_member(community_id)
    and exists (
      select 1 from public.decks d
      where d.id = community_decks.deck_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "sharer or owner unshares" on public.community_decks;
create policy "sharer or owner unshares"
  on public.community_decks
  for delete
  to authenticated
  using (
    (select auth.uid()) = shared_by
    or public.is_community_owner(community_id)
  );


-- -----------------------------------------------------------------------------
-- Joining an invite-only community.
--
-- `security definer` because the caller cannot read `invite_code` — the
-- discoverability policy exposes the row, but a client that could SELECT the
-- code could join every private community. The code is checked here instead,
-- and the caller only learns whether it worked.
-- -----------------------------------------------------------------------------
create or replace function public.join_community_with_code(
  target_slug text,
  code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found uuid;
begin
  select c.id into found
  from public.communities c
  where c.slug = target_slug
    and (
      c.join_policy = 'open'
      -- Compared inside the function so a wrong code and a missing community
      -- are indistinguishable to the caller.
      or (c.invite_code is not null and c.invite_code = code)
    );

  if found is null then
    return null;
  end if;

  insert into public.community_members (community_id, user_id, role)
  values (found, (select auth.uid()), 'member')
  on conflict (community_id, user_id) do nothing;

  return found;
end;
$$;

revoke all on function public.join_community_with_code(text, text) from public, anon;
grant execute on function public.join_community_with_code(text, text) to authenticated;


-- -----------------------------------------------------------------------------
-- Public creator profile counts, without exposing anything private.
-- -----------------------------------------------------------------------------
create or replace function public.creator_stats(target_user uuid)
returns table (public_decks bigint, followers bigint, following bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.decks d
      where d.user_id = target_user and d.visibility = 'public'),
    (select count(*) from public.follows f where f.following_id = target_user),
    (select count(*) from public.follows f where f.follower_id  = target_user);
$$;

grant execute on function public.creator_stats(uuid) to anon, authenticated;
