// sw.js - lets the site open with weak or no signal, and be installed as an app.
// Pages and our own files: try the network first (so updates show), use the saved copy when offline.
// Library files from the CDN: use the saved copy, refresh it in the background.
// Database and weather requests are never saved here.
var CACHE = "mine-monitor-v2";
var CORE = ["./", "index.html", "dashboard.html", "metrics.html", "style.css", "common.js", "i18n.js", "config.js", "demo.js",
            "manifest.json", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
      return hit || net;
    }));
  }
});
