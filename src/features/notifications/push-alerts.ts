/**
 * Server-only: kirim notifikasi bot ke semua perangkat user lewat Web Push.
 * Padanan features/telegram/alerts.ts.
 */
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { pushSubscriptionsTable } from "@/db/schema"
import { isGoneError, isPushConfigured, sendWebPush } from "@/lib/web-push"
import type { PushPayload } from "@/lib/web-push"

/** Hasil per user: berapa perangkat terkirim / gagal. */
export interface PushResult {
  sent: number
  failed: number
}

/**
 * Tidak pernah melempar error — push gagal tidak boleh menghentikan bot.
 * Langganan yang sudah mati (404/410) dihapus.
 */
export async function sendPushAlert(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0 }
  if (!isPushConfigured()) return result
  try {
    const subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId))

    const gone: string[] = []
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await sendWebPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            { url: "/bot", ...payload }
          )
          result.sent++
        } catch (e) {
          result.failed++
          if (isGoneError(e)) gone.push(sub.id)
          else
            console.error(
              `[push] gagal kirim ke user ${userId}:`,
              e instanceof Error ? e.message : e
            )
        }
      })
    )
    if (gone.length > 0) {
      await db
        .delete(pushSubscriptionsTable)
        .where(inArray(pushSubscriptionsTable.id, gone))
    }
  } catch (e) {
    console.error(
      `[push] gagal kirim alert ke user ${userId}:`,
      e instanceof Error ? e.message : e
    )
  }
  return result
}
