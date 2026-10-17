import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { db } from "@/db"
import { portfolioTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq, and } from "drizzle-orm"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export const getPortfolio = createServerFn().handler(async () => {
  const userId = await requireUserId()
  return db
    .select()
    .from(portfolioTable)
    .where(eq(portfolioTable.userId, userId))
    .orderBy(portfolioTable.buyDate)
})

export const addPortfolioPosition = createServerFn()
  .validator(
    z.object({
      symbol: z.string().min(1),
      exchange: z.string().default("BINANCE"),
      quantity: z.number().positive(),
      buyPrice: z.number().positive(),
      buyDate: z.string().min(1),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const rows = await db
      .insert(portfolioTable)
      .values({
        userId,
        symbol: data.symbol.toUpperCase().trim(),
        exchange: data.exchange.toUpperCase().trim(),
        quantity: data.quantity,
        buyPrice: data.buyPrice,
        buyDate: data.buyDate,
        notes: data.notes ?? null,
      })
      .returning()
    return rows[0]!
  })

export const removePortfolioPosition = createServerFn()
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await db
      .delete(portfolioTable)
      .where(and(eq(portfolioTable.id, data.id), eq(portfolioTable.userId, userId)))
    return { success: true }
  })
