import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { and, count, eq } from "drizzle-orm"
import { db, first } from "@/db"
import { pushSubscriptionsTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import { getVapidPublicKey, isPushConfigured } from "@/lib/web-push"
import { sendPushAlert } from "@/features/notifications/push-alerts"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user.id) throw new Error("Unauthorized")
  return session.user.id
}

export const getPushConfig = createServerFn().handler(async () => {
  const userId = await requireUserId()
  const row = await db
    .select({ devices: count() })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId))
    .then(first)
  return {
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
    devices: row?.devices ?? 0,
  }
})

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export const savePushSubscription = createServerFn({ method: "POST" })
  .validator(subscriptionSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const request = getRequest()
    const row = {
      userId,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userAgent: request.headers.get("user-agent"),
    }
    // Endpoint yang sama bisa pindah akun (logout → login akun lain di browser sama).
    await db
      .insert(pushSubscriptionsTable)
      .values(row)
      .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: row })
    return { success: true }
  })

export const removePushSubscription = createServerFn({ method: "POST" })
  .validator(z.object({ endpoint: z.string() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await db
      .delete(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.userId, userId),
          eq(pushSubscriptionsTable.endpoint, data.endpoint)
        )
      )
    return { success: true }
  })

/** Tes end-to-end: server → push service → service worker di semua perangkat user. */
export const sendPushTest = createServerFn({ method: "POST" }).handler(
  async () => {
    const userId = await requireUserId()
    if (!isPushConfigured()) throw new Error("Web Push belum dikonfigurasi di server")
    return sendPushAlert(userId, {
      type: "BUY",
      title: "Tes notifikasi Traxio",
      body: "Push dari server berhasil sampai ke perangkat ini.",
      tag: "traxio-test",
      test: true,
    })
  }
)
