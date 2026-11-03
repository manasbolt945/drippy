-- Usage numbers on every scan, plus a daily summary for the dashboard.
-- Photos are no longer stored (image_path stays null); these columns describe the request instead.
alter table public.scans
  add column duration_ms   integer,  -- how long Claude took
  add column input_tokens  integer,
  add column output_tokens integer,
  add column image_bytes   integer;  -- size of the photo sent (the photo itself is not kept)

-- One row per day. Not exposed to the app (no grants to anon/authenticated); read it in the SQL editor or Table Editor.
-- Cost estimate uses Claude Haiku 5.5 list prices: $0.10 / $0.50 per million input / output tokens.
create view public.daily_stats with (security_invoker = true) as
select
  date_trunc('day', created_at)::date                         as day,
  count(*)                                                    as scans,
  count(*) filter (where status = 'scored')                   as scored,
  count(*) filter (where status = 'not_scorable')             as not_scorable,
  count(*) filter (where status = 'refused')                  as refused,
  count(distinct user_id)                                     as people,
  round(avg(overall) filter (where status = 'scored'), 1)     as avg_score,
  round(avg(duration_ms) / 1000.0, 1)                         as avg_ai_seconds,
  sum(input_tokens)                                           as input_tokens,
  sum(output_tokens)                                          as output_tokens,
  round((coalesce(sum(input_tokens), 0) * 0.10 + coalesce(sum(output_tokens), 0) * 0.50) / 1e6, 4) as est_cost_usd
from public.scans
group by 1
order by 1 desc;

revoke all on public.daily_stats from anon, authenticated;
