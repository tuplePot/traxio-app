import { useEffect } from "react"
import { registerServiceWorker } from "@/features/notifications/push-client"

/**
 * Daftarkan public/sw.js di semua halaman (termasuk login) supaya app bisa
 * di-install sebagai PWA. Tidak merender apa pun.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    void registerServiceWorker()
  }, [])
  return null
}
