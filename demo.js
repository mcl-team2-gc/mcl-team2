// demo.js - DEMO MODE with made-up data. Open any page with ?demo=1 to start, ?demo=0 to stop.
// In demo mode the site does NOT talk to the real database: everything comes from the mock data below,
// and anything you save lives only until you leave the page.
(function () {
  var q = new URLSearchParams(location.search);
  try {
    if (q.get("demo") === "1") sessionStorage.setItem("mclDemo", "1");
    if (q.get("demo") === "0") sessionStorage.removeItem("mclDemo");
    if (sessionStorage.getItem("mclDemo") !== "1") return;
  } catch (e) { return; }

  window.MCL_DEMO = true;
  window.SUPABASE_URL = "https://demo.invalid";
  window.SUPABASE_PUBLISHABLE_KEY = "demo-key-not-real";

  // ---------- helpers ----------
  var seed = 20261127;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function between(a, b) { return a + (b - a) * rnd(); }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function ds(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(s, n) { var p = s.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return ds(d); }
  function iso(dateStr, hh, mm) { var p = dateStr.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], hh, mm || 0).toISOString(); }
  var SHIFT_START = { A: 6, B: 14, C: 22 };
  var now = new Date(), H = now.getHours(), MIN = now.getMinutes();
  try {   // use the mine's clock (India), not the computer's, so the running shift matches the header
    var o = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).forEach(function (p) { o[p.type] = p.value; });
    H = +o.hour; MIN = +o.minute; now = new Date(+o.year, +o.month - 1, +o.day, H, MIN);
  } catch (e) {}
  var curShift = H >= 6 && H < 14 ? "A" : H >= 14 && H < 22 ? "B" : "C";
  var today = ds(now), shiftDate = H < 6 ? addDays(today, -1) : today;
  var order = { A: 0, B: 1, C: 2 };
  function done(date, sh) { return date < shiftDate || (date === shiftDate && order[sh] < order[curShift]); }
  function hoursAgo(h) { return new Date(Date.now() - h * 3600000).toISOString(); }
  var nid = 1; function id() { return "demo-" + (nid++); }
  var rows = [];
  function add(r) { r.id = r.id || id(); r.urgency = r.urgency || "Low"; r.status = r.status || "Open"; r.created_at = r.created_at || hoursAgo(1); rows.push(r); return r; }

  // ---------- made-up mine ----------
  add({ record_type: "setting", title: "Demo Opencast Mine", category: "Asia/Kolkata", details: "system", qty: 21.5, qty2: 84.5, created_at: hoursAgo(2000) });
  var staff = [["admin@example.com", "admin", "Admin"], ["gm@example.com", "gm", "General Manager"], ["po@example.com", "po", "Project Officer"],
               ["mm@example.com", "mm", "Mine Manager"], ["pi@example.com", "pi", "Production Incharge"], ["shift@example.com", "shift", "Shift Incharge"],
               ["overman1@example.com", "overman", "Overman 1"], ["overman2@example.com", "overman", "Overman 2"]];
  staff.forEach(function (s) { add({ record_type: "staff", title: s[0], category: s[1], location: s[2], entered_by: "setup", created_at: hoursAgo(2000) }); });

  var fy = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + "-04-01";
  [["Annual", "Coal", 4500000], ["Annual", "OB", 9700000], ["Monthly", "Coal", 375000], ["Monthly", "OB", 810000], ["Daily", "Coal", 12500], ["Daily", "OB", 27000]]
    .forEach(function (x) { add({ record_type: "target", category: x[0], title: x[1], qty: x[2], entered_by: "po:Project Officer", created_at: hoursAgo(1500) }); });

  var faces = [["C-1", "Coal", "Seam IV, bench 3", "In progress"], ["C-2", "Coal", "Seam IV, bench 4", "In progress"], ["C-3", "Coal", "Seam III, east", "Open"],
               ["C-0", "Coal", "Seam IV, west (worked out)", "Resolved"], ["OB-1", "OB", "Bench 1, north", "In progress"], ["OB-2", "OB", "Bench 2, north", "In progress"], ["OB-3", "OB", "Bench 3, south", "In progress"]];
  var faceRow = {};
  faces.forEach(function (f, i) {
    var r = add({ record_type: "face", title: f[0], category: f[1], location: f[2], status: f[3], entered_by: "pi:Production Incharge", created_at: hoursAgo(24 * (60 - i * 5)) });
    faceRow[f[0]] = r;
    if (f[3] !== "Open") add({ record_type: "log", title: r.id, category: "Status: Active", location: "Working faces: " + f[0], entered_by: "pi:Production Incharge", created_at: hoursAgo(24 * (58 - i * 5)) });
    if (f[3] === "Resolved") add({ record_type: "log", title: r.id, category: "Status: Closed", location: "Working faces: " + f[0], entered_by: "pi:Production Incharge", created_at: hoursAgo(24 * 9) });
  });
  var active = ["C-1", "C-2", "OB-1", "OB-2", "OB-3"];

  var assets = [];
  [["SH", "Shovel", 4], ["EX", "Excavator", 3], ["DT", "Dumper", 12], ["DZ", "Dozer", 2], ["DR", "Drill", 2], ["WT", "Water tanker", 1], ["GR", "Grader", 1]].forEach(function (x) {
    for (var i = 1; i <= x[2]; i++) { var t = x[0] + "-" + pad(i); assets.push([t, x[1]]); add({ record_type: "asset", title: t, category: x[1], entered_by: "admin:Admin", created_at: hoursAgo(2000) }); }
  });

  // production: every finished shift since 1 April
  for (var d = fy; d <= shiftDate; d = addDays(d, 1)) {
    ["A", "B", "C"].forEach(function (s) {
      if (!done(d, s)) return;
      var dip = rnd() < 0.08 ? 0.45 : 1;   // a few bad shifts (rain, breakdowns)
      add({ record_type: "production", title: "Coal", qty: Math.round(between(3500, 4600) * dip), shift: s, record_date: d, entered_by: "shift:Shift Incharge", created_at: iso(d, SHIFT_START[s] + 8 > 23 ? 23 : SHIFT_START[s] + 8, 5) });
      add({ record_type: "production", title: "OB", qty: Math.round(between(7600, 9800) * dip), shift: s, record_date: d, entered_by: "shift:Shift Incharge", created_at: iso(d, SHIFT_START[s] + 8 > 23 ? 23 : SHIFT_START[s] + 8, 6) });
    });
  }

  // today: assignments, plans, deployment, availability
  ["A", "B", "C"].forEach(function (s) {
    add({ record_type: "assign", title: "C-1", location: "Overman 1", shift: s, record_date: shiftDate, entered_by: "shift:Shift Incharge" });
    add({ record_type: "assign", title: "OB-1", location: "Overman 1", shift: s, record_date: shiftDate, entered_by: "shift:Shift Incharge" });
    add({ record_type: "assign", title: "C-2", location: "Overman 2", shift: s, record_date: shiftDate, entered_by: "shift:Shift Incharge" });
    add({ record_type: "assign", title: "OB-2", location: "Overman 2", shift: s, record_date: shiftDate, entered_by: "shift:Shift Incharge" });
    [["C-1", "Coal", 2100], ["C-2", "Coal", 2000], ["OB-1", "OB", 3200], ["OB-2", "OB", 3000], ["OB-3", "OB", 2800]].forEach(function (p) {
      add({ record_type: "plan", title: p[0], category: p[1], qty: p[2], shift: s, record_date: shiftDate, entered_by: "pi:Production Incharge" });
    });
    if (order[s] <= order[curShift]) {
      [["C-1", "Shovel", 1], ["C-1", "Dumper", 3], ["C-2", "Excavator", 1], ["C-2", "Dumper", 2], ["OB-1", "Shovel", 1], ["OB-1", "Dumper", 3], ["OB-2", "Excavator", 1], ["OB-2", "Dumper", 2], ["OB-3", "Shovel", 1], ["OB-3", "Dumper", 2]]
        .forEach(function (x) { add({ record_type: "deploy", title: x[0], category: x[1], qty: x[2], shift: s, record_date: shiftDate, entered_by: "shift:Shift Incharge" }); });
      [["Shovel", 1], ["Dumper", 1], ["Dozer", 2], ["Drill", 1]].forEach(function (x) { add({ record_type: "machine", category: x[0], qty: x[1], shift: s, record_date: shiftDate, entered_by: "shift:Shift Incharge" }); });
    }
  });

  // open breakdowns now + running fleet status for the running shift
  var bd1 = add({ record_type: "breakdown", title: "DT-07", category: "Dumper", location: "OB-1", urgency: "High", status: "Open", qty: 3, details: "Engine overheating", record_date: shiftDate, shift: curShift, entered_by: "overman:Overman 1", created_at: hoursAgo(3.2) });
  var bd2 = add({ record_type: "breakdown", title: "SH-03", category: "Shovel", location: "OB-3", urgency: "Medium", status: "In progress", qty: 1.5, details: "Hydraulic hose burst", record_date: shiftDate, shift: curShift, entered_by: "overman:Overman 2", created_at: hoursAgo(1.6) });
  var place = { Shovel: ["C-1", "OB-1", "OB-3", "OB-2"], Excavator: ["C-2", "OB-2", "C-1"], Dumper: ["C-1", "C-1", "C-1", "C-2", "C-2", "OB-1", "OB-1", "OB-1", "OB-2", "OB-2", "OB-3", "OB-3"] };
  var count = {};
  assets.forEach(function (a) {
    var p = place[a[1]]; if (!p) return;
    count[a[1]] = (count[a[1]] || 0); var face = p[count[a[1]]++ % p.length];
    var st = rnd() < 0.15 ? "Open" : "In progress";
    add({ record_type: "fleet", title: a[0], category: a[1], location: face, status: st, record_date: shiftDate, shift: curShift, entered_by: "overman:" + (face === "C-1" || face === "OB-1" ? "Overman 1" : "Overman 2"), created_at: hoursAgo(between(0.5, 4)) });
  });

  // past breakdowns (repaired) with the time they came back
  for (var i = 0; i < 16; i++) {
    var a = pick(assets.filter(function (x) { return ["Shovel", "Excavator", "Dumper", "Dozer"].indexOf(x[1]) > -1; }));
    var back = between(1, 9), ago = i < 7 ? between(12, 24 * 10) : between(30, 24 * 80), dd = ds(new Date(Date.now() - ago * 3600000));
    var r = add({ record_type: "breakdown", title: a[0], category: a[1], location: pick(active), urgency: pick(["Medium", "High"]), status: "Resolved", qty: Math.round(back * 10) / 10,
                  details: pick(["Tyre puncture", "Engine fault", "Hydraulic leak", "Electrical fault", "Brake problem"]), record_date: dd, shift: pick(["A", "B", "C"]), entered_by: "overman:Overman 1", created_at: hoursAgo(ago) });
    add({ record_type: "log", title: r.id, category: "Status: Back in service", location: "Breakdowns: " + a[0], entered_by: "shift:Shift Incharge", created_at: hoursAgo(ago - back) });
  }

  // HEMM logbook: last 14 days, finished shifts
  for (var k = 13; k >= 0; k--) {
    var day = addDays(shiftDate, -k);
    ["A", "B", "C"].forEach(function (s) {
      if (!done(day, s)) return;
      assets.forEach(function (a) {
        if (["Water tanker", "Grader", "Drill"].indexOf(a[1]) > -1 && rnd() < 0.5) return;
        var diesel = { Shovel: [180, 260], Excavator: [140, 220], Dumper: [90, 150], Dozer: [80, 130], Drill: [40, 70], "Water tanker": [40, 60], Grader: [30, 50] }[a[1]];
        add({ record_type: "hemm", title: a[0], category: a[1], qty: Math.round(between(4.5, 7.8) * 10) / 10, qty2: Math.round(between(diesel[0], diesel[1])),
              shift: s, record_date: day, entered_by: "overman:Overman 1", created_at: iso(day, Math.min(23, SHIFT_START[s] + 7), 50) });
      });
    });
  }

  // trips in the running shift
  var el = (H + MIN / 60 - SHIFT_START[curShift] + 24) % 24;
  active.forEach(function (fc) {       // one entry per face every half hour, like an Overman pressing +5
    var coal = fc.charAt(0) === "C";
    for (var hh = 0.5; hh <= el; hh += 0.5) {
      add({ record_type: "trip", title: coal ? "Coal" : "OB", location: fc, qty: Math.round(coal ? between(3, 5) : between(6, 9)), qty2: coal ? 30 : 25,
            shift: curShift, record_date: shiftDate, entered_by: "overman:Overman 1", created_at: hoursAgo(el - hh) });
    }
  });

  // hindrances over the last 8 weeks
  var kinds = ["Rain / weather", "Blasting / drilling", "Power / diesel", "Road / haul road", "Manpower", "Land / R&R"];
  for (var h = 0; h < 22; h++) {
    var ag = between(6, 24 * 55);
    add({ record_type: "hindrance", category: pick(kinds), title: pick(["Slushy haul road", "Blast delay", "Diesel supply late", "Power cut at sub-station", "Shortage of operators", "Villagers stopped work"]),
          location: pick(active), urgency: pick(["Low", "Medium", "High"]), status: "Resolved", qty: Math.round(between(0.5, 6) * 10) / 10, entered_by: "shift:Shift Incharge", created_at: hoursAgo(ag) });
  }
  add({ record_type: "hindrance", category: "Rain / weather", title: "Haul road slushy near OB-2 ramp", location: "OB-2", urgency: "High", status: "Open", qty: 2, entered_by: "overman:Overman 2", created_at: hoursAgo(4.5) });
  add({ record_type: "hindrance", category: "Power / diesel", title: "Diesel bowser late", location: "C-1", urgency: "Medium", status: "In progress", qty: 0.5, entered_by: "shift:Shift Incharge", created_at: hoursAgo(1.2) });
  add({ record_type: "hindrance", category: "Land / R&R", title: "Land not yet handed over for C-3", location: "C-3", urgency: "Medium", status: "Open", entered_by: "pi:Production Incharge", created_at: hoursAgo(72) });

  // safety
  add({ record_type: "safety", category: "Unsafe condition", title: "Dumper reversing alarm not working", location: "C-1", urgency: "High", status: "Open", details: "DT-03 stopped till repaired", entered_by: "overman:Overman 1", created_at: hoursAgo(2.5) });
  add({ record_type: "safety", category: "Near miss", title: "Loose boulder fell near bench edge", location: "OB-1", urgency: "Medium", status: "In progress", details: "Area barricaded, scaling ordered", entered_by: "overman:Overman 1", created_at: hoursAgo(20) });
  add({ record_type: "safety", category: "Good practice", title: "All operators wearing seat belts", location: "OB-3", urgency: "Low", status: "Resolved", entered_by: "shift:Shift Incharge", created_at: hoursAgo(30) });

  // blasting, water spraying, handover
  add({ record_type: "blast", title: "OB-2", record_date: shiftDate, record_time: "13:30", urgency: "High", status: "Open", details: "500 m danger zone, siren at 13:20", entered_by: "pi:Production Incharge", created_at: hoursAgo(5) });
  add({ record_type: "blast", title: "OB-1", record_date: addDays(shiftDate, -1), record_time: "13:30", urgency: "High", status: "Resolved", entered_by: "pi:Production Incharge", created_at: hoursAgo(28) });
  function hm(hAgo) { var m = ((H * 60 + MIN - Math.round(hAgo * 60)) % 1440 + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  add({ record_type: "spray", location: "Main haul road", record_time: hm(0.7), record_date: shiftDate, shift: curShift, details: "WT-01", entered_by: "overman:Overman 1" });
  add({ record_type: "spray", location: "Coal haul road", record_time: hm(2.6), record_date: shiftDate, shift: curShift, details: "WT-01", entered_by: "overman:Overman 2" });
  var prev = curShift === "A" ? ["C", addDays(shiftDate, -1)] : [curShift === "B" ? "A" : "B", shiftDate];
  add({ record_type: "handover", title: "SH-03 hose leaking - keep a fitter at OB-3", details: "Diesel bowser to come by 10 am. OB-2 ramp slushy.", urgency: "Medium", record_date: prev[1], shift: prev[0], entered_by: "shift:Shift Incharge", created_at: hoursAgo(Math.max(0.3, el)) });

  // instructions + who has seen them
  var i1 = add({ record_type: "instruction", title: "Spray water on all haul roads every 2 hours", location: "Shift Incharge", urgency: "Medium", status: "In progress", entered_by: "mm:Mine Manager", created_at: hoursAgo(6) });
  add({ record_type: "log", title: i1.id, category: "Seen", location: "Instruction", entered_by: "shift:Shift Incharge", created_at: hoursAgo(5.5) });
  add({ record_type: "instruction", title: "Increase coal despatch: 2 extra dumpers on C-2", location: "Everyone", urgency: "High", status: "Open", details: "Rake placement expected at 4 pm", entered_by: "gm:General Manager", created_at: hoursAgo(3) });
  add({ record_type: "instruction", title: "Check reversing alarms on all dumpers", location: "Overman", urgency: "High", status: "Open", entered_by: "po:Project Officer", created_at: hoursAgo(2) });
  add({ record_type: "instruction", title: "Submit monthly HEMM report", location: "Production Incharge", urgency: "Low", status: "Resolved", entered_by: "po:Project Officer", created_at: hoursAgo(48) });

  // ---------- a small copy of the database query language, working on the rows above ----------
  function like(v, p) { var re = new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i"); return re.test(String(v == null ? "" : v)); }
  function Q() { this.f = []; this.o = []; this.lim = null; this.rg = null; }
  Q.prototype.select = function () { return this; };
  Q.prototype.eq = function (c, v) { this.f.push(function (r) { return String(r[c]) === String(v); }); return this; };
  Q.prototype.neq = function (c, v) { this.f.push(function (r) { return String(r[c]) !== String(v); }); return this; };
  Q.prototype.gte = function (c, v) { this.f.push(function (r) { return r[c] != null && r[c] >= v; }); return this; };
  Q.prototype.gt = function (c, v) { this.f.push(function (r) { return r[c] != null && r[c] > v; }); return this; };
  Q.prototype.lte = function (c, v) { this.f.push(function (r) { return r[c] != null && r[c] <= v; }); return this; };
  Q.prototype.lt = function (c, v) { this.f.push(function (r) { return r[c] != null && r[c] < v; }); return this; };
  Q.prototype.in = function (c, a) { this.f.push(function (r) { return a.map(String).indexOf(String(r[c])) > -1; }); return this; };
  Q.prototype.like = function (c, p) { this.f.push(function (r) { return like(r[c], p); }); return this; };
  Q.prototype.ilike = Q.prototype.like;
  Q.prototype.order = function (c, o) { this.o.push([c, !o || o.ascending !== false]); return this; };
  Q.prototype.limit = function (n) { this.lim = n; return this; };
  Q.prototype.range = function (a, b) { this.rg = [a, b]; return this; };
  Q.prototype.run = function () {
    var self = this, out = rows.filter(function (r) { return self.f.every(function (fn) { return fn(r); }); });
    if (this.o.length) out = out.slice().sort(function (a, b) {
      for (var i = 0; i < self.o.length; i++) { var c = self.o[i][0], x = a[c], y = b[c]; if (x === y) continue; var s = (x == null ? -1 : y == null ? 1 : x < y ? -1 : 1); return self.o[i][1] ? s : -s; }
      return 0;
    });
    if (this.rg) out = out.slice(this.rg[0], this.rg[1] + 1);
    if (this.lim != null) out = out.slice(0, this.lim);
    return { data: JSON.parse(JSON.stringify(out)), error: null };
  };
  Q.prototype.then = function (ok, bad) { return Promise.resolve(this.run()).then(ok, bad); };

  function insert(r) {
    var list = Array.isArray(r) ? r : [r], made = list.map(function (x) { return add(Object.assign({}, x, { created_at: new Date().toISOString() })); });
    var res = { data: made.map(function (x) { return { id: x.id }; }), error: null };
    return { select: function () { return Promise.resolve(res); }, then: function (ok, bad) { return Promise.resolve({ error: null }).then(ok, bad); } };
  }
  function update(patch) {
    var w = new Q();
    w.then = function (ok, bad) { this.run().data.forEach(function (r) { rows.forEach(function (x) { if (x.id === r.id) Object.assign(x, patch); }); }); return Promise.resolve({ error: null }).then(ok, bad); };
    return w;
  }
  function who() { try { return sessionStorage.getItem("mclDemoUser"); } catch (e) { return null; } }
  var client = {
    from: function () { return { select: function () { return new Q(); }, insert: insert, update: update }; },
    auth: {
      getSession: function () { var e = who(); return Promise.resolve({ data: { session: e ? { user: { email: e } } : null }, error: null }); },
      signInWithPassword: function (c) {
        var e = String(c.email || "").toLowerCase();
        if (!staff.some(function (s) { return s[0] === e; })) return Promise.resolve({ data: null, error: { message: "Demo: use one of the demo e-mails, e.g. shift@example.com (any password)." } });
        try { sessionStorage.setItem("mclDemoUser", e); } catch (x) {}
        return Promise.resolve({ data: { user: { email: e } }, error: null });
      },
      signOut: function () { try { sessionStorage.removeItem("mclDemoUser"); } catch (x) {} return Promise.resolve({ error: null }); }
    }
  };
  window.supabase = { createClient: function () { return client; } };

  // ---------- banner ----------
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.createElement("div");
    b.className = "demo-bar";
    b.innerHTML = "<b>DEMO MODE</b> - made-up data, nothing is saved. Sign in with any demo e-mail (admin@, gm@, po@, mm@, pi@, shift@, overman1@ or overman2@example.com) and any password. " +
      '<a href="?demo=0">Exit demo</a>';
    document.body.insertBefore(b, document.body.firstChild);
  });
})();
