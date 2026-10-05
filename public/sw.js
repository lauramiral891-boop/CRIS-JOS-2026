/* Service worker: faz a app abrir e funcionar sem internet. */
const CACHE = "cjgerenciamento-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./logo.png", "./logo-192.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Páginas: tenta a rede, e se não houver internet usa a cópia guardada
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Ficheiros da própria app e fontes: cópia guardada primeiro, atualiza em segundo plano
  if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
  // Outros pedidos (IA, etc.) seguem normalmente pela rede
});

/* Clicar numa notificação abre/foca a app */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      if (cs.length) return cs[0].focus();
      return self.clients.openWindow("./");
    })
  );
});

/* Pronto para Web Push (quando houver servidor): mostra o aviso mesmo com a app fechada */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "CJ Gerenciamento", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(
    self.registration.showNotification(d.title || "CJ Gerenciamento", {
      body: d.body || "", icon: "./icon-192.png", badge: "./icon-192.png", tag: d.tag, vibrate: [200, 100, 200],
    })
  );
});
