// Uygulama kabuğunu önbelleğe alır (çevrimdışı açılsın). GitHub API isteklerine dokunmaz.
const SURUM = "zk-v6";
const KABUK = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "ornek.js", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(KABUK)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== SURUM).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== "GET") return; // API ve dış istekler ağdan
  // önce ağ (güncel sürüm gelsin), olmazsa önbellek
  e.respondWith(
    fetch(e.request)
      .then((r) => { const kopya = r.clone(); caches.open(SURUM).then((c) => c.put(e.request, kopya)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
