/* Bitácora SLP - service worker
   Guarda la app en el dispositivo para que funcione sin conexión.
   Al publicar una versión nueva, sube el CACHE (v14 -> v15...) y se
   actualizará sola la próxima vez que haya conexión. */
const CACHE = "bitacora-slp-v15";

/* Solo se precargan recursos garantizados; los iconos se cachean al vuelo. */
const SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
