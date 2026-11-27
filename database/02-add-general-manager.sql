-- 02-add-general-manager.sql : adds the General Manager passcode.
-- The General Manager can open ALL modules on the Data entry page.
-- Paste this WHOLE block into the Supabase SQL Editor and press Run.
-- BEFORE RUNNING: change the made-up passcode (the text after the last colon).
-- Safe to run twice: it adds the row only if it is missing.
insert into public.mine_records (record_type, category, title, details, entered_by)
select 'user', 'gm', 'General Manager',
       encode(sha256(convert_to('mcl:gm:GM@2026', 'UTF8')), 'hex'), 'setup'
where not exists (
  select 1 from public.mine_records u
  where u.record_type = 'user' and u.category = 'gm');
