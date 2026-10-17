import { useSyncExternalStore } from "react"

/**
 * Preferensi notifikasi web disimpan per perangkat (localStorage), karena izin
 * notifikasi browser juga per perangkat/browser — bukan per akun.
 */
export interface WebNotificationPrefs {
  /** Pop-up toast di dalam aplikasi. */
  toast: boolean
  /** Notifikasi browser/OS (butuh izin Notification). */
  browser: boolean
  /**
   * Perangkat ini berlangganan Web Push — notifikasi OS dikirim server lewat
   * service worker, juga saat semua tab tertutup.
   */
  push: boolean
}

const STORAGE_KEY = "traxio-web-notifications"
const CHANGE_EVENT = "traxio-web-notifications-change"
const DEFAULT_PREFS: WebNotificationPrefs = {
  toast: true,
  browser: false,
  push: false,
}

let cachedRaw: string | null | undefined
let cachedPrefs: WebNotificationPrefs = DEFAULT_PREFS

export function readWebNotificationPrefs(): WebNotificationPrefs {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return DEFAULT_PREFS
  }
  // Snapshot harus stabil antar-render untuk useSyncExternalStore.
  if (raw === cachedRaw) return cachedPrefs
  cachedRaw = raw
  try {
    cachedPrefs = raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch {
    cachedPrefs = DEFAULT_PREFS
  }
  return cachedPrefs
}

export function setWebNotificationPrefs(patch: Partial<WebNotificationPrefs>) {
  const next = { ...readWebNotificationPrefs(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / storage diblokir — preferensi berlaku sampai reload saja.
    cachedRaw = JSON.stringify(next)
    cachedPrefs = next
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  // Sinkron antar-tab.
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function useWebNotificationPrefs(): WebNotificationPrefs {
  return useSyncExternalStore(subscribe, readWebNotificationPrefs, () => DEFAULT_PREFS)
}

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window
}
