-- Newer Supabase projects don't expose new public tables to the Data API automatically.
-- Grant only what the app uses; row level security still limits every row to its owner.
grant select, update on public.profiles to authenticated;
grant select, delete on public.scans to authenticated;
grant all on public.profiles, public.scans to service_role;
grant usage on type public.scan_status to authenticated, service_role;
