# CLAUDE.md - read this first, in every session

## About us
- We are a team of 4-5 people from Mahanadi Coalfields Limited (MCL) at an
  IIM Sambalpur MDP. We are NOT programmers.
- Explain everything in plain English, in short sentences. If you must use a
  technical word, explain it in one line.
- We build ONE small web tool in phases. Only one Claude session works at a
  time. The Progress Log at the end of this file is our handover logbook.

## What we are building
- A tool with at most 3 pages: index.html (entry page), dashboard.html
  (dashboard) and metrics.html (charts). Extra views (daily report, TV mode)
  are modes of dashboard.html, not new pages.
- Every record has location, urgency (Low / Medium / High) and status
  (Open / In progress / Resolved), plus the columns in "Our tool" below.
- All data is MADE UP. Never add real names, phone numbers, employee IDs or
  real MCL figures.

## Technical rules
1. Plain HTML, CSS and JavaScript only. Pages stay in the top folder; SQL
   files go in the database folder. No frameworks, no npm, no package.json,
   no build step.
2. Vercel publishes the site from the main branch. Use relative links only,
   e.g. href="dashboard.html".
3. Load Supabase from the jsDelivr CDN, then our settings, in this order:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="config.js"></script>
   Then create the client like this (do not call the variable "supabase"):
     const db = window.supabase.createClient(window.SUPABASE_URL,
                                              window.SUPABASE_PUBLISHABLE_KEY);
4. The Project URL and the publishable key live only in config.js. Never use
   or ask for a secret key, a service_role key or the database password.
5. For charts, load Chart.js from the jsDelivr CDN.
6. Sign-in: anyone with the link can VIEW the dashboard and metrics. To ADD or
   CHANGE data, staff sign in with e-mail + password (Supabase Auth). There is
   no public sign-up: the Admin adds the person to the Staff list on the site,
   and the Data Keeper creates the same e-mail in Supabase (Authentication >
   Users > Add user, "Auto Confirm User" ticked). Roles are checked by the
   database (function mine_can in 01-setup.sql), not only by the website.
6b. Other shared files in the top folder: common.js (header, icons, helpers),
   i18n.js (Hindi/Odia words), style.css, manifest.json + sw.js + icon files
   (install as an app, offline use). The weather card uses the free
   Open-Meteo service (only the mine's latitude/longitude is sent).
7. You may not be able to reach our database. Do NOT try to test the database
   connection. Write the code; we test it on the live website.
8. If anything fails, show a friendly message on the page that also includes
   the actual error text, so we can pass it on.
9. Every page must work well on a mobile phone: large buttons, readable text,
   no sideways scrolling. Use the same header and menu on every page.
10. Never delete config.js or CLAUDE.md.

## Database rules
- Our Data Keeper runs all SQL by pasting it into the Supabase SQL Editor.
  You cannot run SQL yourself.
- ALL SQL lives in ONE file: database/01-setup.sql. It must stay safe to run
  again (create if not exists, where not exists, drop policy if exists).
  When something changes, update that file and ask the Data Keeper to run it
  again.
- One table. It must have: id uuid primary key default gen_random_uuid()
  and created_at timestamptz not null default now().
- Enable Row Level Security. anon (not signed in) may only SELECT.
  authenticated may INSERT and UPDATE only the record types their role allows
  (function mine_can). The staff list is hidden from anon. No delete.
- Always include: grant select, insert, update on the table to anon,
  authenticated; (new Supabase projects need it, or the website gets
  "permission denied").
- Never drop a table or delete rows.
- Avoid changing the table after Phase 1. If a change is really needed, give
  one small block and explain it in one sentence.

## How to work with us
- Make one change at a time. Do not change parts that already work unless we
  ask.
- After each change, reply in 3 short bullets: what you changed and what we
  should test on the live website.
- Commit and push your work at every stopping point.

## Takeover and handover
- At the START of every session: read the Progress Log below and summarize it
  in 3 bullets (what exists, what works, what is next).
- At a "save point": add a new entry at the end of the Progress Log (phase,
  builder, what was built, what works, known problems, next step). Then
  commit and push.

## Our tool (filled in during Phase 1)
- Team: MCL team 2 (IIM Sambalpur MDP)
- Tool name: Mine Monitor (operational status of an opencast coal mine)
- Problem: Management cannot see faces, machines, targets, production, hindrances in one place.
- Who records / who decides: staff sign in with e-mail + password. Roles: Admin, General Manager (gm),
  Project Officer (po), Mine Manager (mm), Production Incharge (pi), Shift Incharge (shift), Overman.
  GM/PO/MM give targets and instructions; PI plans faces, shift plans and blasts; Shift Incharge
  deploys fleet, assigns Overmen, posts production and handover; Overman reports fleet status,
  breakdowns, HEMM logbook, trips, water spraying. Everyone can report hindrances and safety.
- Table name and columns: mine_records (id, created_at, record_type, category, title, location,
  urgency, status, shift, record_date, record_time, qty, qty2, details, entered_by).
  record_type = setting / staff / asset / target / face / plan / blast / assign / deploy / machine /
  fleet / breakdown / hemm / trip / production / hindrance / safety / spray / handover / instruction / log.
  "log" rows are the audit trail (title = id of the changed row). Old "user" rows are unused.
- Pages: index.html = entry page (sign-in + modules); dashboard.html = dashboard (also ?date=,
  ?report=1 daily report, ?tv=1 TV mode); metrics.html = charts. Shared: style.css, common.js,
  i18n.js, manifest.json, sw.js, icon.svg, icon-192.png, icon-512.png.
- Units: Coal in tonnes, OB in cu.m (shown as Million when 1,000,000 or more).

## Progress Log (newest entry at the bottom)
- Phase 0 (starter): placeholder index.html, config.js without settings and
  this CLAUDE.md. Next: Phase 1 - the table and the entry page.
- Phase 1 (Claude): Built database/01-setup.sql (one table mine_records, RLS, grants, 5 role passcodes), index.html (sign-in + 8 entry modules), dashboard.html (instructions, production vs targets with current-shift estimate, faces, machines by shift, hindrances), style.css, common.js. Works: code written, NOT yet tested on the live site. Known problems: passcodes are a simple gate, not real security (anyone with the key can reach the table); trips are summed, so enter only NEW trips. Next: Data Keeper edits passcodes in 01-setup.sql and runs it, fills config.js, team tests on the live site.
- Phase 1b (Claude): Added General Manager role (passcode gate, sees ALL entry modules, same as Admin). index.html updated; new database/02-add-general-manager.sql adds the passcode (made-up default mcl:gm:GM@2026). Works: not yet tested live. Next: Data Keeper runs 02 in Supabase, team tests GM sign-in.
- Phase 2 (Claude): Six roles + Admin: General Manager (gm), Project Officer (po), Mine Manager (mm), Production Incharge (pi), Shift Incharge (shift), Overman (overman). GM and Admin see all modules. PO/MM: targets + instructions (for a chosen role) + hindrances. PI: create faces, set Planned/Active/Closed. Shift Incharge: fleet deployment (machines per face per shift, active faces only), fleet available, trips, production status. Overman: trips + hindrances. Admin: mine name, system clock or by-hand date/time, time zone. New page metrics.html (Chart.js charts + KPI tiles); menu is now Dashboard / Metrics / Data entry. New database/03-add-roles.sql (passcodes po, mm, pi, overman; made-up). Old roles planning/production/management are no longer offered. New record_type "deploy"; "machine" now means fleet available (count per type). Works: pages checked offline with a fake database, not tested live. Next: Data Keeper runs 03 (and 02 if not yet), team tests each role on the live site.
- Phase 3 (Claude): Shift Incharge assigns Overmen to Active faces (record_type "assign": face in title, Overman name in location, per date + shift). Overman signs in with a name/ID (matched ignoring capital letters), sees only faces assigned to them for the running shift, and reports: Running fleet status (record_type "fleet": Idle / Running / Off duty, changeable with buttons), Breakdowns (record_type "breakdown": Breakdown / Under repair / Back in service), hindrances (face picked from own faces) and trips. Date and shift are filled in automatically for fleet and breakdown entries. Dashboard: new cards Running fleet status, Overmen on faces, Open breakdowns. Metrics: new tile Machines in breakdown. No SQL change needed. Works: checked offline with a fake database, not tested live. Known problems: Overman name is typed text, so spelling must match; all Overmen share one passcode.
- Phase 3b (Claude): ALL SQL is now ONE file, database/01-setup.sql (table + passcodes for all 7 roles). Deleted 02-add-general-manager.sql and 03-add-roles.sql (merged in). Safe to run again: adds only missing roles, never deletes. Next: Data Keeper runs the new 01-setup.sql once in Supabase.
- Phase 3c (Claude): Units. Coal shows in Tonnes or Million Tonnes, OB in cu.m or Million cu.m (picked automatically; 1,000,000 or more shows as Million). Target and Production forms have a "Unit of the quantity" box (plain or Million); numbers are still stored in tonnes / cu.m. Works: checked offline, not tested live. No SQL change.
- Phase 4 (Claude): New modern look (style.css rewritten): dark sticky header with live-clock dot and shift chips, pill menu, cards with shadows, coloured KPI tiles, soft badges, two-column forms on wide screens. Dashboard rewritten: summary strip of 8 KPI tiles at top, cleaner production cards, one "Deployment by shift" table (overmen + machines + available), "Refresh now" button and "Updated hh:mm". Faster: dashboard uses 4 database requests instead of 12, metrics 5 instead of 8, only needed columns are read, and pages stop refreshing while hidden in the background. Save button shows "Saving..." to stop double entries. Works: checked offline with a fake database and phone-size screenshots; not tested live. No SQL change.
- Phase 4b (Claude): Icons and graphics. common.js now has MCL.icon(name) (26 line icons drawn in the page, no download) and MCL.art() (opencast mine picture: benches, coal seam, dumper, shovel). Used in: menu, header chips, KPI tiles, card headings, data entry tabs, empty states, sign-in card picture, faint mine picture in the header. Dashboard has a new orange banner: greeting, running shift, time left with a bar, running machines / active faces / breakdowns. Works: checked offline with phone screenshots; not tested live. No SQL change.
- Phase 5 (Claude): ALL improvements from the ideas list. (1) Real security: e-mail + password sign-in
  (Supabase Auth), Staff list module, role checks inside the database (mine_can), anon can only read.
  (2) New modules: My instructions (Seen/Done), Machine list (pick lists), Shift plan per face, Blasting
  schedule, HEMM logbook (hours + diesel), Water spraying, Shift handover, Safety observations, Audit
  trail; quick "+1/+5/+10 trip" buttons; Edit your own entries; entries made offline are kept on the
  phone and sent later. (3) Dashboard: blasting and "urgent > 2 h" alerts, handover card, 12 KPI tiles,
  required run rate + month/year-end forecast, plan vs actual by face, availability/utilisation,
  weather (Open-Meteo), water-spraying status, safety card, "Seen by" on instructions, view any past
  date, Daily report (print/PDF), Share (WhatsApp), TV mode. (4) Metrics: month-by-month vs target,
  stripping ratio, availability/utilisation by type, diesel per day and per tonne, hours lost per week,
  breakdown report with average repair time, face history. (5) Dark mode button, language switch
  (English / Hindi / Odia - words in i18n.js, need checking by a native speaker), install as an app
  (manifest + sw.js). Works: checked offline with a fake database and real Chart.js, phone-size
  screenshots, no page errors; NOT tested live. Known problems: data entry needs the new
  01-setup.sql run again AND Supabase users created for each staff e-mail; hints in forms stay in
  English; weather needs latitude/longitude in Mine settings. Next: Data Keeper runs 01-setup.sql,
  creates the 8 sample users (or your own made-up ones) in Supabase Authentication, team tests each role.
