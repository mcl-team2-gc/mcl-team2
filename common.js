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
    function link(href, key, text) { return '<a href="' + href + '"' + (active === key ? ' class="on" aria-current="page"' : "") + ">" + text + "</a>"; }
    host.className = "top";
    host.innerHTML = '<div class="hd-in">' +
      '<div class="brand"><span class="logo">' + LOGO + '</span><div><div class="sub">Mine Monitor</div><h1>' + MCL.esc(n.name) + "</h1></div></div>" +
      '<div class="chips">' +
        '<span class="chip">' + MCL.esc(MCL.prettyDate(n.date)) + "</span>" +
        '<span class="chip"><span class="dot' + (n.live ? "" : " off") + '"></span><b>' + MCL.esc(n.time) + "</b>" + (n.live ? "" : " (set by hand)") + "</span>" +
        '<span class="chip">Shift <b>' + n.shift + "</b>&nbsp;" + SHIFT_HOURS[n.shift] + "</span>" +
        '<span class="chip">' + MCL.esc(n.tz) + "</span>" +
      "</div>" +
      '<nav class="menu">' + link("dashboard.html", "dash", "Dashboard") + link("metrics.html", "metrics", "Metrics") + link("index.html", "entry", "Data entry") + "</nav></div>";
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
  MCL.kpi = function (label, value, sub, tone) {
    return '<div class="kpi ' + (tone || "") + '"><span class="lbl">' + MCL.esc(label) + "</span><b>" + value + "</b>" +
      (sub ? '<span class="muted">' + sub + "</span>" : "") + "</div>";
  };
  MCL.clockText = function () { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
})();
