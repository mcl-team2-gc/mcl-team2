-- 03-add-roles.sql : adds passcodes for the new roles.
--   po = Project Officer, mm = Mine Manager, pi = Production Incharge, overman = Overman
-- (General Manager "gm" came from 02, Shift Incharge "shift" came from 01.)
-- Paste this WHOLE block into the Supabase SQL Editor and press Run.
-- BEFORE RUNNING: change the made-up passcodes (the text after the last colon).
-- Safe to run twice: it adds a row only if that role has none yet.
insert into public.mine_records (record_type, category, title, details, entered_by)
select 'user', v.role, v.label, encode(sha256(convert_to(v.secret, 'UTF8')), 'hex'), 'setup'
from (values
  ('po',      'Project Officer',     'mcl:po:PO@2026'),
  ('mm',      'Mine Manager',        'mcl:mm:MM@2026'),
  ('pi',      'Production Incharge', 'mcl:pi:PI@2026'),
  ('overman', 'Overman',             'mcl:overman:Overman@2026')
) as v(role, label, secret)
where not exists (
  select 1 from public.mine_records u
  where u.record_type = 'user' and u.category = v.role);
