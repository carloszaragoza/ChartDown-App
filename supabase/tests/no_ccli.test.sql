-- R-00.5 test (pgTAP): ChartDown App stores no CCLI data (decision 10).
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select is(
  (select count(*)::int from information_schema.columns
   where table_schema = 'public' and column_name ilike '%ccli%'),
  0, 'R-00.5 no table stores a CCLI number'
);

select * from finish();
rollback;
