// common.js - helpers shared by every page (header, clock, errors, passcodes).
(function () {
  var MCL = window.MCL = {};
  var TABLE = "mine_records";
  MCL.TABLE = TABLE;

  MCL.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  MCL.num = function (n, d) {
    n = Number(n); if (!isFinite(n)) n = 0;
    return n.toLocaleString("en-IN", { maximumFractionDigits: d == null ? 0 : d });
  };
  // Coal is measured in Tonnes / Million Tonnes, OB in cu.m / Million cu.m. Stored in the base unit.
  MCL.UNITS = { Coal: { base: "tonnes", mil: "Million Tonnes" }, OB: { base: "cu.m", mil: "Million cu.m" } };
  MCL.fmtQty = function (n, mat) {
    var u = MCL.UNITS[mat] || MCL.UNITS.Coal; n = Number(n); if (!isFinite(n)) n = 0;
    return Math.abs(n) >= 1000000 ? MCL.num(n / 1000000, 2) + " " + u.mil : MCL.num(n) + " " + u.base;
  };
  MCL.errText = function (e) {
    if (!e) return "";
    var t = e.message || String(e);
    if (e.details) t += " | " + e.details;
    if (e.hint) t += " | " + e.hint;
    if (e.code) t += " (code " + e.code + ")";
    return t;
  };
  MCL.showMsg = function (el, kind, text, err) {
    el.innerHTML = '<div class="msg ' + kind + '">' + MCL.esc(text) +
      (err ? "<br><small>Error text to pass on: " + MCL.esc(MCL.errText(err)) + "</small>" : "") + "</div>";
  };
  MCL.configReady = function () {
    var u = window.SUPABASE_URL || "", k = window.SUPABASE_PUBLISHABLE_KEY || "";
    return u.indexOf("PASTE") === -1 && u.indexOf("http") === 0 && k.indexOf("PASTE") === -1 && k.length > 10;
  };
  MCL.sha256 = async function (text) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  };
  MCL.fetchAll = async function (build) {   // reads more than 1000 rows, page by page
    var out = [], from = 0, size = 1000;
    for (;;) {
      var r = await build().range(from, from + size - 1);
      if (r.error) throw r.error;
      out = out.concat(r.data);
      if (r.data.length < size) break;
      from += size;
    }
    return out;
  };
  MCL.loadSetting = async function (db) {
    var r = await db.from(TABLE).select("*").eq("record_type", "setting")
      .order("created_at", { ascending: false }).limit(1);
    if (r.error) throw r.error;
    return r.data[0] || null;
  };


  // ---- small helpers ----
  MCL.store = function (k, v) {          // phone storage that never crashes (private mode etc.)
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  };
  MCL.timeText = function (iso) {        // "27 Nov 14:05" in the phone's own time
    if (!iso) return "";
    var d = new Date(iso), m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + m[d.getMonth()] + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  // Translation: MCL.t("English text") gives the chosen language, or English if no translation exists.
  MCL.lang = function () { return MCL.store("mclLang") || "en"; };
  MCL.t = function (s) { var d = (window.MCL_LANG || {})[MCL.lang()]; return (d && d[s]) || s; };
  MCL.translatePage = function () {      // elements marked data-t are translated once
    Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (el) {
      if (!el.dataset.en) el.dataset.en = el.textContent.trim();
      el.textContent = MCL.t(el.dataset.en);
    });
  };

  // ---- icons (simple line drawings, drawn in the page - nothing to download) ----
  var IC = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    coal: '<path d="M4 14l3-7 6-3 6 4 1 7-5 5H8z"/><path d="M7 7l4 5 8-4"/><path d="M11 12l-3 8"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    truck: '<path d="M2 7h11v9H2z"/><path d="M13 10h4l4 3.5V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    pickaxe: '<path d="M14.5 12.5 6.6 20.4a1.4 1.4 0 0 1-2-2l7.9-7.9"/><path d="M15.7 4.3A12.5 12.5 0 0 0 5.5 3a1 1 0 0 0 .1 1.7 22 22 0 0 1 6.3 3.4"/><path d="M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="M19.7 8.3A12.5 12.5 0 0 1 21 18.5a1 1 0 0 1-1.7-.1 22 22 0 0 0-3.4-6.3"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    hardhat: '<path d="M2 18h20"/><path d="M4 18v-2a8 8 0 0 1 16 0v2"/><path d="M10 9V5h4v4"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    factory: '<path d="M2 20h20"/><path d="M4 20V10l5 3v-3l5 3V6h6v14"/><path d="M8 17h1M13 17h1M17 17h1"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>'
  };
  MCL.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[name] || IC.grid) + "</svg>";
  };
  // Opencast mine picture: benches, coal seam, dumper and shovel.
  MCL.art = function (cls) {
    return '<svg class="art ' + (cls || "") + '" viewBox="0 0 400 160" aria-hidden="true" preserveAspectRatio="xMidYMax meet">' +
      '<defs><linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/></linearGradient>' +
      '<linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>' +
      '<circle cx="335" cy="34" r="16" fill="#fcd34d" opacity=".9"/>' +
      '<path d="M0 62 60 30 110 50 170 18 240 48 300 26 400 58 400 160 0 160z" fill="#94a3b8" opacity=".35"/>' +
      '<rect x="0" y="60" width="400" height="100" fill="#92400e"/>' +
      '<path d="M24 60h352l-22 22H46z" fill="url(#ag1)"/>' +
      '<path d="M46 82h308l-22 22H68z" fill="#d97706"/>' +
      '<path d="M68 104h264l-22 22H90z" fill="#b45309"/>' +
      '<path d="M90 126h220l-16 22H106z" fill="url(#ag2)"/>' +
      '<path d="M120 136h20M180 140h30M240 134h24" stroke="#64748b" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
      // dumper on the top bench
      '<g transform="translate(96 36)"><path d="M2 8h34l-4 12H6z" fill="#fde68a"/><rect x="36" y="10" width="14" height="10" rx="2" fill="#f59e0b"/>' +
      '<rect x="40" y="12" width="6" height="4" fill="#0f172a" opacity=".7"/><rect x="4" y="19" width="46" height="4" fill="#78350f"/>' +
      '<circle cx="12" cy="25" r="5" fill="#0f172a"/><circle cx="12" cy="25" r="2" fill="#94a3b8"/><circle cx="42" cy="25" r="5" fill="#0f172a"/><circle cx="42" cy="25" r="2" fill="#94a3b8"/></g>' +
      // shovel on the coal bench
      '<g transform="translate(222 92)"><rect x="0" y="22" width="34" height="8" rx="3" fill="#0f172a"/><rect x="4" y="10" width="24" height="13" rx="2" fill="#fbbf24"/>' +
      '<rect x="20" y="12" width="6" height="5" fill="#0f172a" opacity=".7"/><path d="M26 12 46 0l10 12" stroke="#fbbf24" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M52 10h10l-2 12h-10z" fill="#475569"/></g>' +
      "</svg>";
  };

  // ---- dates and shifts (A 06-14, B 14-22, C 22-06) ----
  function pad(n) { return String(n).padStart(2, "0"); }
  MCL.DEFAULT_TZ = "Asia/Kolkata";
  MCL.TZS = ["Asia/Kolkata", "Asia/Dhaka", "Asia/Kathmandu", "Asia/Colombo", "Asia/Dubai", "Asia/Singapore",
             "Asia/Tokyo", "Australia/Sydney", "Africa/Johannesburg", "Europe/London", "Europe/Berlin",
             "America/New_York", "America/Chicago", "America/Los_Angeles", "UTC"];
  MCL.addDays = function (ds, n) {
    var p = ds.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  };
  MCL.prettyDate = function (ds) {
    var p = ds.split("-"), m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return +p[2] + " " + m[+p[1] - 1] + " " + p[0];
  };
  MCL.fyStart = function (ds) {            // financial year starts 1 April
    var y = +ds.slice(0, 4), m = +ds.slice(5, 7);
    return (m >= 4 ? y : y - 1) + "-04-01";
  };
  // Date and time as shown by the system clock in a chosen time zone.
  MCL.zoneNow = function (tz) {
    try {
      var o = {};
      new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { date: o.year + "-" + o.month + "-" + o.day, time: o.hour + ":" + o.minute };
    } catch (e) {
      var d = new Date();
      return { date: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
               time: pad(d.getHours()) + ":" + pad(d.getMinutes()) };
    }
  };
  // Setting row: title = mine name, category = time zone, details = "system" or "manual",
  // record_date / record_time = hand-set values (used only when "manual").
  MCL.mineNow = function (s) {
    var tz = (s && s.category) || MCL.DEFAULT_TZ;
    var manual = s && (s.details ? s.details === "manual" : (s.record_date && s.record_time));
    var sys = MCL.zoneNow(tz);
    var dateStr = (manual && s.record_date) || sys.date;
    var timeStr = (manual && s.record_time) ? s.record_time.slice(0, 5) : sys.time;
    var h = +timeStr.slice(0, 2), m = +timeStr.slice(3, 5);
    var shift, start;
    if (h >= 6 && h < 14) { shift = "A"; start = 6; }
    else if (h >= 14 && h < 22) { shift = "B"; start = 14; }
    else { shift = "C"; start = 22; }
    var el = h + m / 60 - start; if (el < 0) el += 24;
    return {
      name: (s && s.title) || "Mine name not set yet",
      date: dateStr, time: timeStr, shift: shift, elapsed: Math.min(el, 8), tz: tz,
      shiftDate: h < 6 ? MCL.addDays(dateStr, -1) : dateStr,   // night shift after midnight belongs to previous day
      live: !manual
    };
  };

  // ---- same header + menu on every page ----
  var SHIFT_HOURS = { A: "6 am - 2 pm", B: "2 pm - 10 pm", C: "10 pm - 6 am" };
  var LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M5 20l5-9 3 5 2-3 4 7"/><circle cx="16" cy="6" r="2"/></svg>';
  MCL.renderHeader = function (active, setting) {
    MCL._active = active; MCL._setting = setting;
    var n = MCL.mineNow(setting), host = document.getElementById("app-header");
    function link(href, key, text, ic) { return '<a href="' + href + '"' + (active === key ? ' class="on" aria-current="page"' : "") + ">" + MCL.icon(ic) + "<span>" + text + "</span></a>"; }
    host.className = "top";
    host.innerHTML = MCL.art("hd-art") + '<div class="hd-in">' +
      '<div class="brand"><span class="logo">' + LOGO + '</span><div><div class="sub">Mine Monitor</div><h1>' + MCL.esc(n.name) + "</h1></div></div>" +
      '<div class="chips">' +
        '<span class="chip">' + MCL.icon("calendar") + MCL.esc(MCL.prettyDate(n.date)) + "</span>" +
        '<span class="chip"><span class="dot' + (n.live ? "" : " off") + '"></span><b>' + MCL.esc(n.time) + "</b>" + (n.live ? "" : " (set by hand)") + "</span>" +
        '<span class="chip">' + MCL.icon("clock") + 'Shift <b>' + n.shift + "</b>&nbsp;" + SHIFT_HOURS[n.shift] + "</span>" +
        '<span class="chip">' + MCL.icon("globe") + MCL.esc(n.tz) + "</span>" +
      "</div>" +
      '<nav class="menu">' + link("dashboard.html", "dash", "Dashboard", "grid") + link("metrics.html", "metrics", "Metrics", "chart") + link("index.html", "entry", "Data entry", "edit") + "</nav></div>";
    if (!MCL._tick) {   // keep the clock moving (only while the page is on screen)
      MCL._tick = setInterval(function () { if (!document.hidden) MCL.renderHeader(MCL._active, MCL._setting); }, 30000);
    }
    return n;
  };

  // Run fn now and every "ms" milliseconds, but only while the page is on screen.
  MCL.autoRefresh = function (fn, ms) {
    fn();
    setInterval(function () { if (!document.hidden) fn(); }, ms);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) fn(); });
  };
  MCL.kpi = function (label, value, sub, tone, ic) {
    return '<div class="kpi ' + (tone || "") + '">' + (ic ? '<span class="kic">' + MCL.icon(ic) + "</span>" : "") + '<span class="lbl">' + MCL.esc(label) + "</span><b>" + value + "</b>" +
      (sub ? '<span class="muted">' + sub + "</span>" : "") + "</div>";
  };
  MCL.h2 = function (ic, text, tone) { return '<h2><span class="hic ' + (tone || "") + '">' + MCL.icon(ic) + "</span>" + text + "</h2>"; };
  MCL.emptyState = function (ic, text) { return '<div class="empty">' + MCL.icon(ic) + "<span>" + text + "</span></div>"; };
  MCL.clockText = function () { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
})();
