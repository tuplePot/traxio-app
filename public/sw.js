/* Traxio service worker — Web Push + klik notifikasi.
 * Sengaja tanpa cache halaman: data trading harus selalu segar dari server. */

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

function parsePayload(event) {
  if (!event.data) return {}
  try {
    return event.data.json()
  } catch {
    return { body: event.data.text() }
  }
}

async function handlePush(event) {
  const data = parsePayload(event)
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })

  // Minta tab yang terbuka langsung refetch → toast di aplikasi muncul
  // tanpa menunggu polling berikutnya.
  for (const client of windows) {
    client.postMessage({ type: "traxio-push", id: data.id })
  }

  // Tab sedang dipakai → toast di aplikasi sudah cukup, jangan dobel.
  const focused = windows.some(
    (c) => c.focused && c.visibilityState === "visible"
  )
  if (focused && !data.test) return

  await self.registration.showNotification(data.title || "Traxio", {
    body: data.body || "",
    // Tag sama dengan notifikasi dari tab (traxio-<id>) → tidak dobel.
    tag: data.tag || (data.id ? `traxio-${data.id}` : undefined),
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    data: { url: data.url || "/bot" },
  })
}

self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event))
})

async function openUrl(url) {
  const target = new URL(url, self.location.origin)
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  const existing = windows.find(
    (c) => new URL(c.url).origin === target.origin
  )
  if (existing) {
    await existing.focus()
    // Navigasi client-side di tab yang ada (tanpa reload) — lihat ServiceWorkerBridge.
    existing.postMessage({
      type: "traxio-navigate",
      url: target.pathname + target.search,
    })
    return
  }
  await self.clients.openWindow(target.href)
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/bot"
  event.waitUntil(openUrl(url))
})
