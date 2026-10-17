/**
 * Client-only: service worker + langganan Web Push di browser ini.
 */
import { removePushSubscription, savePushSubscription } from "@/server/push"

const SW_URL = "/sw.js"

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" })
  } catch (e) {
    console.error("[pwa] gagal mendaftarkan service worker:", e)
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function sameKey(sub: PushSubscription, publicKey: string): boolean {
  const current = sub.options.applicationServerKey
  if (!current) return false
  const a = new Uint8Array(current)
  const b = urlBase64ToUint8Array(publicKey)
  return a.length === b.length && a.every((v, i) => v === b[i])
}

async function saveToServer(sub: PushSubscription) {
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("Langganan push dari browser tidak lengkap")
  }
  await savePushSubscription({
    data: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  })
}

/**
 * Langganan push di browser ini lalu simpan ke server. Idempoten: kalau sudah
 * berlangganan dengan kunci yang sama, cukup sinkron ulang ke server (mis.
 * setelah login akun lain di browser yang sama).
 */
export async function subscribePush(publicKey: string): Promise<void> {
  await registerServiceWorker()
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  // Kunci VAPID server berganti → langganan lama tidak bisa dipakai lagi.
  if (sub && !sameKey(sub, publicKey)) {
    await sub.unsubscribe()
    sub = null
  }
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  await saveToServer(sub)
}

/** Berhenti berlangganan di browser ini dan hapus dari server. */
export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await removePushSubscription({ data: { endpoint: sub.endpoint } })
  await sub.unsubscribe()
}

/**
 * Saat logout: putuskan perangkat ini dari akun di server, tapi biarkan
 * langganan browser — login berikutnya menyambungkan ulang ke akun baru.
 */
export async function detachPushFromAccount(): Promise<void> {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await removePushSubscription({ data: { endpoint: sub.endpoint } })
  } catch {
    // Logout tidak boleh gagal hanya karena ini.
  }
}
