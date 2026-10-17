import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { db, first, one } from "@/db"
import { settingsTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

async function fetchLiveUsdToIdr(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { "Accept": "application/json" },
    })
    if (!res.ok) return 16300
    const data = (await res.json()) as { rates: Record<string, number> }
    return Math.round(data.rates.IDR ?? 16300)
  } catch {
    return 16300
  }
}

export interface SettingsWithRate {
  id: string
  userId: string
  currency: string
  customUsdToIdr: number
  usdToIdr: number
  updatedAt: string
}

export const getSettings = createServerFn().handler(async (): Promise<SettingsWithRate> => {
  const userId = await requireUserId()
  const existing = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId)).then(first)
  const row = existing ?? one(await db.insert(settingsTable).values({ userId }).returning())
  const usdToIdr = row.customUsdToIdr > 0 ? row.customUsdToIdr : await fetchLiveUsdToIdr()
  return { ...row, usdToIdr }
})

export const updateSettings = createServerFn()
  .validator(
    z.object({
      currency: z.enum(["USD", "IDR"]).optional(),
      customUsdToIdr: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ data }): Promise<SettingsWithRate> => {
    const userId = await requireUserId()
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.userId, userId))
      .then(first)
    let row: typeof settingsTable.$inferSelect
    if (existing) {
      row = await db
        .update(settingsTable)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(settingsTable.userId, userId))
        .returning()
        .then(one)
    } else {
      row = await db.insert(settingsTable).values({ userId, ...data }).returning().then(one)
    }
    const usdToIdr = row.customUsdToIdr > 0 ? row.customUsdToIdr : await fetchLiveUsdToIdr()
    return { ...row, usdToIdr }
  })
