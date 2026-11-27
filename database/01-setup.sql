-- 01-setup.sql : Mine Operations Monitor - Phase 1
-- Paste this WHOLE block into the Supabase SQL Editor and press Run.
-- ONE table holds everything. "record_type" tells what a row is:
--   setting, target, face, machine, trip, production, hindrance, instruction, user
-- BEFORE RUNNING: change the 5 passcodes in the last part (all made up).

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

alter table public.mine_records enable row level security;

drop policy if exists "mine select" on public.mine_records;
drop policy if exists "mine insert" on public.mine_records;
drop policy if exists "mine update" on public.mine_records;
create policy "mine select" on public.mine_records
  for select to anon, authenticated using (true);
create policy "mine insert" on public.mine_records
  for insert to anon, authenticated with check (true);
create policy "mine update" on public.mine_records
  for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.mine_records to anon, authenticated;

-- Starting mine name (made-up). Admin can change it on the website.
insert into public.mine_records (record_type, title, entered_by)
select 'setting', 'Sample Opencast Mine', 'setup'
where not exists (select 1 from public.mine_records where record_type = 'setting');

-- Passcodes for the 5 roles (made up - CHANGE THE TEXT AFTER THE LAST COLON).
-- Format of the text inside quotes:  mcl:<role>:<passcode>
insert into public.mine_records (record_type, category, title, details, entered_by)
select 'user', v.role, v.label, encode(sha256(convert_to(v.secret, 'UTF8')), 'hex'), 'setup'
from (values
  ('admin',      'Admin',                 'mcl:admin:Admin@2026'),
  ('planning',   'Planning officer',      'mcl:planning:Plan@2026'),
  ('shift',      'Shift in-charge',       'mcl:shift:Shift@2026'),
  ('production', 'Production / weighbridge', 'mcl:production:Prod@2026'),
  ('management', 'Higher management',     'mcl:management:Mgmt@2026')
) as v(role, label, secret)
where not exists (
  select 1 from public.mine_records u
  where u.record_type = 'user' and u.category = v.role);
