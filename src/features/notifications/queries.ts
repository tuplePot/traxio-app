import { getNotifications } from "@/server/bot"

/**
 * Dipakai bersama oleh NotificationBell dan NotificationWatcher (query key
 * sama → satu cache). Tetap polling saat tab di background supaya notifikasi
 * browser tetap muncul walau tab tidak aktif.
 */
export const notificationsQueryOptions = () => ({
  queryKey: ["notifications"],
  queryFn: () => getNotifications(),
  refetchInterval: 15 * 1000,
  refetchIntervalInBackground: true,
})
