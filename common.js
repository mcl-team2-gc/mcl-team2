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
  MCL.mineNow = function (s) {
    var d = new Date();
    var dateStr = (s && s.record_date) || (d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()));
    var timeStr = (s && s.record_time) ? s.record_time.slice(0, 5) : (pad(d.getHours()) + ":" + pad(d.getMinutes()));
    var h = +timeStr.slice(0, 2), m = +timeStr.slice(3, 5);
    var shift, start;
    if (h >= 6 && h < 14) { shift = "A"; start = 6; }
    else if (h >= 14 && h < 22) { shift = "B"; start = 14; }
    else { shift = "C"; start = 22; }
    var el = h + m / 60 - start; if (el < 0) el += 24;
    return {
      name: (s && s.title) || "Mine name not set yet",
      date: dateStr, time: timeStr, shift: shift, elapsed: Math.min(el, 8),
      shiftDate: h < 6 ? MCL.addDays(dateStr, -1) : dateStr,   // night shift after midnight belongs to previous day
      live: !(s && s.record_date && s.record_time)
    };
  };

  // ---- same header + menu on every page ----
  MCL.renderHeader = function (active, setting) {
    var n = MCL.mineNow(setting), host = document.getElementById("app-header");
    host.className = "top";
    host.innerHTML =
      "<h1>" + MCL.esc(n.name) + "</h1>" +
      '<div class="clock">' + MCL.esc(MCL.prettyDate(n.date)) + " &middot; " + MCL.esc(n.time) +
      " &middot; Shift " + n.shift + (n.live ? "" : " (set by admin)") + "</div>" +
      '<nav class="menu"><a href="dashboard.html"' + (active === "dash" ? ' class="on"' : "") + ">Dashboard</a>" +
      '<a href="index.html"' + (active === "entry" ? ' class="on"' : "") + ">Data entry</a></nav>";
    return n;
  };
})();
