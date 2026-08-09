-- =============================================================================
-- 0006_ai_refund.sql — give a daily allowance back when the call never happened
--
-- Run after 0005_ai.sql.
--
-- Quota is spent before the model request, so cancelling mid-flight can't be
-- used to get free tokens. The cost of that ordering is that a request which
-- never reached the model — Groq's per-minute limit rejecting it, a network
-- failure — still burns an allowance. On a shared free-tier key that is common
-- enough to matter, so the routes hand it back.
--
-- Refunds ONLY apply to failures before any tokens were generated. A model that
-- ran and produced a bad answer is not refunded: the tokens were really spent,
-- and refunding them would make "generate until it looks right" free.
-- =============================================================================

create or replace function public.refund_ai_quota(quota_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if quota_kind not in ('generation', 'tutor') then
    raise exception 'unknown quota kind: %', quota_kind;
  end if;

  update public.ai_usage
     set generations_used = case
           when quota_kind = 'generation'
           -- greatest(...) so a double refund can never push the counter below
           -- zero and hand out an extra generation.
           then greatest(public.ai_usage.generations_used - 1, 0)
           else public.ai_usage.generations_used
         end,
         tutor_messages_used = case
           when quota_kind = 'tutor'
           then greatest(public.ai_usage.tutor_messages_used - 1, 0)
           else public.ai_usage.tutor_messages_used
         end,
         updated_at = now()
   where user_id = (select auth.uid())
     and usage_date = current_date;
end;
$$;

revoke all on function public.refund_ai_quota(text) from public, anon;
grant execute on function public.refund_ai_quota(text) to authenticated;
