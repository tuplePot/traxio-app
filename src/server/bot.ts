import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db, first, one } from "@/db"
import {
  botConfigTable,
  botDecisionsTable,
  botRunsTable,
  botSymbolsTable,
  botWorkerTable,
  notificationsTable,
  paperPositionsTable,
  SINGLETON_ID,
} from "@/db/schema"
import { auth } from "@/lib/auth"
import { isLlmConfigured, LLM_MODEL } from "@/lib/llm"
import {
  closePositionManually,
  getAccountState,
  getOrCreateConfig,
  runBotForUser,
} from "@/features/bot/engine"
import {
  DEFAULT_WATCHLIST,
  nextRunAt,
  RUN_INTERVAL_MINUTES,
  TIERS,
} from "@/features/bot/constants"
import { sendScheduleNotice } from "@/features/telegram/alerts"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

/** Worker dianggap hidup kalau heartbeat < 3 menit yang lalu. */
const WORKER_ALIVE_MS = 3 * 60 * 1000

export const getBotOverview = createServerFn().handler(async () => {
  const userId = await requireUserId()
  const config = await getOrCreateConfig(userId)
  const account = await getAccountState(userId, config)
  const worker = await db
    .select()
    .from(botWorkerTable)
    .where(eq(botWorkerTable.id, SINGLETON_ID))
    .then(first)
  const runs = await db
    .select()
    .from(botRunsTable)
    .where(eq(botRunsTable.userId, userId))
    .orderBy(desc(botRunsTable.startedAt))
    .limit(10)
  const closedPositions = await db
    .select()
    .from(paperPositionsTable)
    .where(
      and(
        eq(paperPositionsTable.userId, userId),
        eq(paperPositionsTable.status, "CLOSED")
      )
    )
    .orderBy(desc(paperPositionsTable.closedAt))
    .limit(10)

  return {
    config,
    account,
    closedPositions,
    runs,
    ai: { configured: isLlmConfigured(), model: LLM_MODEL },
    worker: {
      alive:
        !!worker &&
        Date.now() - new Date(worker.lastSeenAt).getTime() < WORKER_ALIVE_MS,
      lastSeenAt: worker?.lastSeenAt ?? null,
    },
    nextRunAt:
      config.nextRunAt ??
      nextRunAt(new Date(), config.runIntervalMinutes).toISOString(),
  }
})

export const botConfigInputSchema = z.object({
  enabled: z.boolean(),
  aiEnabled: z.boolean(),
  maxOrdersPerDay: z.number().int().min(1).max(10),
  maxOpenPositions: z.number().int().min(1).max(10),
  startingBalance: z.number().positive(),
  expiryDays: z.number().int().min(1).max(90),
  runIntervalMinutes: z
    .number()
    .int()
    .refine((m) => RUN_INTERVAL_MINUTES.some((o) => o === m), "Interval tidak valid"),
})

export type BotConfigInput = z.infer<typeof botConfigInputSchema>

export const updateBotConfig = createServerFn()
  .validator(botConfigInputSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const before = await getOrCreateConfig(userId)
    const { expiryDays, ...rest } = data
    const next = nextRunAt(new Date(), data.runIntervalMinutes)
    const updated = await db
      .update(botConfigTable)
      .set({
        ...rest,
        nextRunAt: next.toISOString(),
        expiresAt: new Date(
          Date.now() + expiryDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(botConfigTable.userId, userId))
      .returning()
      .then(one)
    const scheduleChanged =
      before.enabled !== data.enabled ||
      (data.enabled && before.runIntervalMinutes !== data.runIntervalMinutes)
    if (scheduleChanged)
      await sendScheduleNotice(userId, data.enabled, next, data.runIntervalMinutes)
    return updated
  })

export const runBotNow = createServerFn({ method: "POST" }).handler(
  async () => {
    const userId = await requireUserId()
    return runBotForUser(userId, "MANUAL")
  }
)

export const closePaperPosition = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return closePositionManually(userId, data.id)
  })

export const getBotDecisions = createServerFn()
  .validator(
    z.object({ limitRuns: z.number().int().min(1).max(50).default(10) })
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const runs = await db
      .select()
      .from(botRunsTable)
      .where(eq(botRunsTable.userId, userId))
      .orderBy(desc(botRunsTable.startedAt))
      .limit(data.limitRuns)
    if (runs.length === 0) return []
    const decisions = await db
      .select()
      .from(botDecisionsTable)
      .where(
        inArray(
          botDecisionsTable.runId,
          runs.map((r) => r.id)
        )
      )
      .orderBy(botDecisionsTable.createdAt)
    return runs.map((run) => ({
      run,
      decisions: decisions.filter((d) => d.runId === run.id),
    }))
  })

export const getBotSymbols = createServerFn().handler(async () => {
  const userId = await requireUserId()
  return db
    .select()
    .from(botSymbolsTable)
    .where(eq(botSymbolsTable.userId, userId))
    .orderBy(botSymbolsTable.symbol)
})

export const addBotSymbol = createServerFn()
  .validator(
    z.object({ symbol: z.string().min(1).max(20), tier: z.enum(TIERS) })
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const symbol = data.symbol.toUpperCase().trim().replace(/USDT$/, "")
    await db
      .insert(botSymbolsTable)
      .values({ userId, symbol, tier: data.tier })
      .onConflictDoUpdate({
        target: [botSymbolsTable.userId, botSymbolsTable.symbol],
        set: { tier: data.tier },
      })
    return { success: true }
  })

export const removeBotSymbol = createServerFn()
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await db
      .delete(botSymbolsTable)
      .where(
        and(eq(botSymbolsTable.id, data.id), eq(botSymbolsTable.userId, userId))
      )
    return { success: true }
  })

export const loadDefaultBotWatchlist = createServerFn({
  method: "POST",
}).handler(async () => {
  const userId = await requireUserId()
  const rows = TIERS.flatMap((tier) =>
    DEFAULT_WATCHLIST[tier].map((symbol) => ({ userId, symbol, tier }))
  )
  await db.insert(botSymbolsTable).values(rows).onConflictDoNothing()
  return { success: true }
})

export const getNotifications = createServerFn().handler(async () => {
  const userId = await requireUserId()
  return db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(20)
})

export const markNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    const userId = await requireUserId()
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.read, false)
        )
      )
    return { success: true }
  }
)
