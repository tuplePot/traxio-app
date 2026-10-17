import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { db } from "@/db"
import { tradesTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq, desc, and } from "drizzle-orm"
import type { NewTrade } from "@/db/schema/trades"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export const tradeInputSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive(),
  outcome: z.enum(["WIN", "LOSS", "BREAKEVEN"]).optional(),
  emotionNote: z.string().optional(),
  setupType: z.string().optional(),
  entryMistake: z.boolean().optional(),
  closedAt: z.string().optional(),
})

export type TradeInput = z.infer<typeof tradeInputSchema>

export const getTrades = createServerFn().handler(async () => {
  const userId = await requireUserId()
  return db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.createdAt))
})

export const getTrade = createServerFn()
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const rows = await db
      .select()
      .from(tradesTable)
      .where(and(eq(tradesTable.id, data.id), eq(tradesTable.userId, userId)))
      .limit(1)
    if (!rows[0]) throw new Error("Trade not found")
    return rows[0]
  })

export const createTrade = createServerFn()
  .validator(tradeInputSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const riskReward =
      data.exitPrice != null
        ? Math.abs((data.exitPrice - data.entryPrice) / (data.entryPrice - data.stopLoss))
        : Math.abs((data.takeProfit - data.entryPrice) / (data.entryPrice - data.stopLoss))
    const newTrade: NewTrade = {
      userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice ?? null,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      riskReward: Math.round(riskReward * 100) / 100,
      outcome: data.outcome ?? null,
      emotionNote: data.emotionNote ?? null,
      setupType: data.setupType ?? null,
      entryMistake: data.entryMistake ?? false,
      closedAt: data.closedAt ?? null,
    }
    const rows = await db.insert(tradesTable).values(newTrade).returning()
    return rows[0]
  })

export const updateTrade = createServerFn()
  .validator(z.object({ id: z.uuid(), data: tradeInputSchema }))
  .handler(async ({ data: { id, data } }) => {
    const userId = await requireUserId()
    const riskReward =
      data.exitPrice != null
        ? Math.abs((data.exitPrice - data.entryPrice) / (data.entryPrice - data.stopLoss))
        : Math.abs((data.takeProfit - data.entryPrice) / (data.entryPrice - data.stopLoss))
    const rows = await db
      .update(tradesTable)
      .set({
        symbol: data.symbol.toUpperCase(),
        direction: data.direction,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice ?? null,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        riskReward: Math.round(riskReward * 100) / 100,
        outcome: data.outcome ?? null,
        emotionNote: data.emotionNote ?? null,
        setupType: data.setupType ?? null,
        entryMistake: data.entryMistake ?? false,
        closedAt: data.closedAt ?? null,
      })
      .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)))
      .returning()
    if (!rows[0]) throw new Error("Trade not found")
    return rows[0]
  })

export const deleteTrade = createServerFn()
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await db
      .delete(tradesTable)
      .where(and(eq(tradesTable.id, data.id), eq(tradesTable.userId, userId)))
    return { success: true }
  })
