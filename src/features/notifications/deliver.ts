import { toast } from "sonner"
import type { Notification as BotNotification } from "@/db/schema"
import type { WebNotificationPrefs } from "./preferences"
import { browserNotificationsSupported } from "./preferences"

type NotificationPayload = Pick<BotNotification, "id" | "type" | "title" | "body">

const TOAST_BY_TYPE = {
  BUY: toast.success,
  EXIT: toast.warning,
  INFO: toast.info,
  ERROR: toast.error,
  SEROK: toast.info,
} satisfies Record<BotNotification["type"], typeof toast.info>

interface DeliverOptions {
  /** Dipanggil saat user klik toast/notifikasi browser. */
  onOpen: () => void
  /**
   * Tampilkan notifikasi browser walau tab sedang dilihat (untuk tombol tes).
   * Default: hanya saat tab tidak terlihat, karena toast sudah cukup.
   */
  forceBrowser?: boolean
}

async function showBrowserNotification(
  n: NotificationPayload,
  onOpen: () => void
): Promise<boolean> {
  if (!browserNotificationsSupported()) return false
  if (Notification.permission !== "granted") return false
  const options: NotificationOptions = {
    body: n.body,
    // Tag per notifikasi → beberapa tab terbuka tidak memunculkan duplikat.
    tag: `traxio-${n.id}`,
  }
  try {
    // Android Chrome hanya mengizinkan notifikasi lewat service worker.
    // serviceWorker tidak ada di konteks non-HTTPS (selain localhost).
    const reg =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined
    if (reg) {
      await reg.showNotification(n.title, options)
      return true
    }
    const notification = new Notification(n.title, options)
    notification.onclick = () => {
      window.focus()
      onOpen()
      notification.close()
    }
    return true
  } catch {
    return false
  }
}

export function deliverNotification(
  n: NotificationPayload,
  prefs: WebNotificationPrefs,
  { onOpen, forceBrowser = false }: DeliverOptions
) {
  if (prefs.toast) {
    TOAST_BY_TYPE[n.type](n.title, {
      id: `notification-${n.id}`,
      description: n.body,
      duration: 8000,
      action: { label: "Lihat", onClick: onOpen },
    })
  }
  const tabHidden = document.visibilityState !== "visible"
  // Dengan push aktif, notifikasi OS datang dari server lewat service worker.
  const viaTab = prefs.browser && !prefs.push
  if (viaTab && (forceBrowser || tabHidden || !prefs.toast)) {
    void showBrowserNotification(n, onOpen)
  }
}

/** Ringkasan saat banyak notifikasi masuk sekaligus (mis. setelah laptop bangun). */
export function deliverSummary(
  count: number,
  prefs: WebNotificationPrefs,
  onOpen: () => void
) {
  deliverNotification(
    {
      id: `local-${Date.now()}`,
      type: "INFO",
      title: `${count} notifikasi bot baru`,
      body: "Buka halaman Bot untuk detailnya.",
    },
    prefs,
    { onOpen }
  )
}
