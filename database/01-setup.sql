-- 01-setup.sql : Mine Operations Monitor - the ONLY SQL file.
-- Paste this WHOLE block into the Supabase SQL Editor and press Run.
-- Safe to run again: it never deletes rows and only adds what is missing.
--
-- ONE table holds everything. "record_type" tells what a row is:
--   setting, staff, asset, target, face, plan, blast, assign, deploy, machine,
--   fleet, breakdown, hemm, trip, production, hindrance, safety, spray,
--   handover, instruction, log   (old rows of type "user" are no longer used)
--
-- WHO CAN DO WHAT (checked by the database, not only by the website):
--   Anyone with the link can READ (except staff list and old passcodes).
--   Only SIGNED-IN staff can ADD or CHANGE rows, and only the kinds their role allows.

-- 1. The table -------------------------------------------------------------
create table if not exists public.mine_records (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  record_type text not null,
  category    text,
  title       text,
  location    text,
  urgency     text not null default 'Low'
              check (urgency in ('Low','Medium','High')),
  status      text not null default 'Open'
              check (status in ('Open','In progress','Resolved')),
  shift       text check (shift in ('A','B','C')),
  record_date date,
  record_time text,
  qty         numeric,
  qty2        numeric,
  details     text,
  entered_by  text
);
create index if not exists mine_records_type_idx
  on public.mine_records (record_type, record_date);

-- 2. Role check: which role does the signed-in person have? ---------------
-- A "staff" row links an e-mail (title) to a role (category) and a name (location).
-- The newest staff row for an e-mail counts. Status "Resolved" = account switched off.
create or replace function public.mine_can(rt text, act text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text; st text;
begin
  select category, status into r, st from public.mine_records
   where record_type = 'staff' and lower(title) = lower(coalesce(auth.jwt() ->> 'email', ''))
   order by created_at desc limit 1;
  if r is null or st = 'Resolved' then return false; end if;
  if rt = 'user' then return false; end if;
  if r = 'admin' then return true; end if;
  if rt in ('staff', 'setting') then return false; end if;
  if r = 'gm' then return true; end if;
  if rt in ('log', 'hindrance', 'safety') then return true; end if;
  if act = 'update' and rt = 'instruction' then return true; end if;   -- everyone can mark "Seen" / "Done"
  return case r
    when 'po'      then rt in ('target', 'instruction', 'blast')
    when 'mm'      then rt in ('target', 'instruction', 'blast')
    when 'pi'      then rt in ('face', 'plan', 'blast', 'asset')
    when 'shift'   then rt in ('asset', 'assign', 'deploy', 'machine', 'production', 'handover',
                               'fleet', 'breakdown', 'trip', 'spray', 'hemm')
    when 'overman' then rt in ('fleet', 'breakdown', 'trip', 'spray', 'hemm')
    else false end;
end $$;
grant execute on function public.mine_can(text, text) to anon, authenticated;

-- 3. Security rules ---------------------------------------------------------
alter table public.mine_records enable row level security;
drop policy if exists "mine select" on public.mine_records;
drop policy if exists "mine insert" on public.mine_records;
drop policy if exists "mine update" on public.mine_records;
create policy "mine select" on public.mine_records
  for select to anon, authenticated
  using (record_type not in ('staff', 'user') or (record_type = 'staff' and auth.role() = 'authenticated'));
create policy "mine insert" on public.mine_records
  for insert to authenticated with check (public.mine_can(record_type, 'insert'));
create policy "mine update" on public.mine_records
  for update to authenticated
  using (public.mine_can(record_type, 'update')) with check (public.mine_can(record_type, 'update'));
grant select, insert, update on public.mine_records to anon, authenticated;

-- 4. Starting mine name (made-up). Admin can change it on the website. -----
insert into public.mine_records (record_type, title, category, details, entered_by)
select 'setting', 'Sample Opencast Mine', 'Asia/Kolkata', 'system', 'setup'
where not exists (select 1 from public.mine_records where record_type = 'setting');

-- 5. Staff list (MADE-UP e-mails). One row per person: e-mail, role, name.
--    Role codes: admin, gm, po, mm, pi, shift, overman
--    For EACH e-mail below, also create a user in Supabase:
--    Authentication > Users > Add user > Create new user (tick "Auto Confirm User").
--    Change these e-mails and names to your own made-up ones BEFORE running.
insert into public.mine_records (record_type, title, category, location, entered_by)
select 'staff', v.email, v.role, v.name, 'setup'
from (values
  ('admin@example.com',    'admin',   'Admin'),
  ('gm@example.com',       'gm',      'General Manager'),
  ('po@example.com',       'po',      'Project Officer'),
  ('mm@example.com',       'mm',      'Mine Manager'),
  ('pi@example.com',       'pi',      'Production Incharge'),
  ('shift@example.com',    'shift',   'Shift Incharge'),
  ('overman1@example.com', 'overman', 'Overman 1'),
  ('overman2@example.com', 'overman', 'Overman 2')
) as v(email, role, name)
where not exists (
  select 1 from public.mine_records s
  where s.record_type = 'staff' and lower(s.title) = lower(v.email));
