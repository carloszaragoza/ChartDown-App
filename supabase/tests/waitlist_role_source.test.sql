-- T-1310 tests (pgTAP): the waitlist keeps the role and where the person joined; joining again
-- answers the same and only fills a missing role. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

set local role anon;
select lives_ok($$select public.join_waitlist('Maya@Example.test', 'en', null, 'hero')$$,
  'R-01.8 a visitor joins from the hero with no role');
select lives_ok($$select public.join_waitlist('maya@example.test', 'en', 'music_director', 'final_cta')$$,
  'R-01.8 joining again answers the same');
select lives_ok($$select public.join_waitlist('noor@example.test', 'es', 'teacher', 'final_cta')$$,
  'R-01.8 a visitor joins from the final panel with a role');
select lives_ok($$select public.join_waitlist('odd@example.test', 'en', 'roadie', 'tiktok')$$,
  'R-01.8 an unknown role or source is left empty, not refused');
reset role;

select results_eq(
  $$select email, role, source from public.waitlist
    where email in ('maya@example.test', 'noor@example.test', 'odd@example.test') order by email$$,
  $$values ('maya@example.test', 'music_director', 'hero'),
           ('noor@example.test', 'teacher', 'final_cta'),
           ('odd@example.test', null::text, null::text)$$,
  'R-01.8 the role is kept, a missing one is filled once, and the first source stays');
select lives_ok($$select public.join_waitlist('noor@example.test', 'es', 'musician', 'hero')$$,
  'R-01.8 a later visit with another role answers the same');
select is((select role from public.waitlist where email = 'noor@example.test'), 'teacher',
  'R-01.8 a role already given is not replaced');

select * from finish();
rollback;
