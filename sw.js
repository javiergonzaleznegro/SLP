/* Bitácora SLP - service worker
   Estrategia:
   - La app (index.html y navegaciones): NETWORK-FIRST. Si hay conexión, coge
     siempre la última versión publicada; si no hay, tira de la copia guardada.
     Así las actualizaciones entran solas sin quedarse pegada una versión vieja.
   - Iconos y manifiesto: cache-first (no cambian casi nunca).
   Al publicar una versión nueva, sube el número de CACHE. */
const CACHE = "bitacora-slp-v20";
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
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var isApp = req.mode === "navigate" ||
              url.pathname.endsWith("/") ||
              url.pathname.endsWith("index.html");

  if (isApp) {
    /* NETWORK-FIRST: intenta la red; si falla, usa la copia guardada. */
    e.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return resp;
      }).catch(function () {
        return caches.match("./index.html").then(function (hit) {
          return hit || caches.match("./");
        });
      })
    );
    return;
  }

  /* Resto (iconos, manifiesto): cache-first. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return resp;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
