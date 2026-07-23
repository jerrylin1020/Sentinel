-- Emergency remediation for Supabase's "RLS disabled in public" warning.
--
-- Sentinel accesses Postgres only through its trusted Python API. It does not
-- access these tables from a browser with the anon or authenticated roles, so
-- enabling RLS without permissive policies intentionally denies Data API
-- access while preserving access for the table owner and service roles.

begin;

alter table if exists public.rule enable row level security;
alter table if exists public.rulebackteststats enable row level security;
alter table if exists public.scan_run enable row level security;
alter table if exists public.signal enable row level security;
alter table if exists public.symbol enable row level security;
alter table if exists public.watchedsymbol enable row level security;

commit;

-- Verification: this query must return zero rows.
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and not rowsecurity
order by tablename;

-- Review existing policies after remediation. No rows is the expected result
-- for Sentinel's current server-only database access model.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
