import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { db } from "@/db"
import { watchlistTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq, and } from "drizzle-orm"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export const getWatchlist = createServerFn().handler(async () => {
  const userId = await requireUserId()
  return db
    .select()
    .from(watchlistTable)
    .where(eq(watchlistTable.userId, userId))
    .orderBy(watchlistTable.addedAt)
})

export const addToWatchlist = createServerFn()
  .validator(
    z.object({
      symbol: z.string().min(1).max(30),
      exchange: z.string().default("BINANCE"),
      description: z.string().optional(),
      symbolType: z.string().optional(),
      groupId: z.uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const symbol = data.symbol.toUpperCase().trim()
    const exchange = data.exchange.toUpperCase().trim()
    const existing = await db
      .select()
      .from(watchlistTable)
      .where(
        and(
          eq(watchlistTable.userId, userId),
          eq(watchlistTable.symbol, symbol),
          eq(watchlistTable.exchange, exchange),
        ),
      )
      .limit(1)
    if (existing[0]) return existing[0]
    const rows = await db
      .insert(watchlistTable)
      .values({
        userId,
        symbol,
        exchange,
        description: data.description ?? null,
        symbolType: data.symbolType ?? null,
        groupId: data.groupId ?? null,
      })
      .returning()
    return rows[0]
  })

export const removeFromWatchlist = createServerFn()
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await db
      .delete(watchlistTable)
      .where(and(eq(watchlistTable.id, data.id), eq(watchlistTable.userId, userId)))
    return { success: true }
  })
