import { useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { getPushConfig } from "@/server/push"
import { notificationsQueryOptions } from "./queries"
import {
  readWebNotificationPrefs,
  setWebNotificationPrefs,
  useWebNotificationPrefs,
} from "./preferences"
import { deliverNotification, deliverSummary } from "./deliver"
import { pushSupported, subscribePush } from "./push-client"

/** Lebih dari ini sekaligus → satu ringkasan, bukan rentetan pop-up. */
const MAX_INDIVIDUAL = 3

/**
 * Sinkron ulang langganan push saat app dibuka: menyambungkan perangkat ke
 * akun yang sedang login dan mendeteksi izin yang sudah dicabut.
 */
async function syncPushSubscription() {
  if (!readWebNotificationPrefs().push) return
  if (!pushSupported() || Notification.permission !== "granted") {
    setWebNotificationPrefs({ push: false, browser: false })
    return
  }
  try {
    const config = await getPushConfig()
    if (!config.configured || !config.publicKey) return
    await subscribePush(config.publicKey)
  } catch (e) {
    console.error("[push] gagal sinkron langganan:", e)
  }
}

/**
 * Memunculkan notifikasi bot yang baru masuk sebagai toast di aplikasi
 * dan/atau notifikasi browser. Dipasang sekali di layout _app; tidak
 * merender apa pun.
 */
export function NotificationWatcher() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const prefs = useWebNotificationPrefs()
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const { data } = useQuery(notificationsQueryOptions())
  // null = belum ada data pertama. Notifikasi yang sudah ada saat halaman
  // dibuka tidak dimunculkan ulang — itu tetap ada di lonceng.
  const seenIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    void syncPushSubscription()
  }, [])

  // Pesan dari public/sw.js: push masuk → refetch sekarang (toast langsung
  // muncul), klik notifikasi → pindah halaman tanpa reload.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    function onMessage(event: MessageEvent) {
      const msg = event.data as { type?: string; url?: string } | null
      if (msg?.type === "traxio-push") {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      } else if (msg?.type === "traxio-navigate" && msg.url) {
        router.history.push(msg.url)
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [queryClient, router])

  useEffect(() => {
    if (!data) return
    const baseline = seenIds.current
    seenIds.current = new Set([...(baseline ?? []), ...data.map((n) => n.id)])
    if (baseline === null) return

    const fresh = data
      .filter((n) => !baseline.has(n.id) && !n.read)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (fresh.length === 0) return

    const openBot = () => navigate({ to: "/bot" })
    if (fresh.length > MAX_INDIVIDUAL) {
      deliverSummary(fresh.length, prefsRef.current, openBot)
      return
    }
    for (const n of fresh) {
      deliverNotification(n, prefsRef.current, { onOpen: openBot })
    }
  }, [data, navigate])

  return null
}
