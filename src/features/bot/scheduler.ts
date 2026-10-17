/**
 * Penjadwal per user: jalankan bot untuk setiap user yang jadwalnya sudah
 * jatuh tempo, lalu catat jadwal berikutnya sesuai interval masing-masing.
 * Dipanggil worker tiap tick — dan bisa dipanggil cron HTTP nanti.
 */
import { and, eq, isNull, lte, or } from "drizzle-orm"
import { db } from "@/db"
import { botConfigTable, botWorkerTable, SINGLETON_ID } from "@/db/schema"
import type { BotConfig } from "@/db/schema"
import { getAccountState, runBotForUser } from "./engine"
import { nextRunAt } from "./constants"
import { sendRunSummary } from "@/features/telegram/alerts"

async function setNextRun(userId: string, next: Date) {
  await db
    .update(botConfigTable)
    .set({ nextRunAt: next.toISOString() })
    .where(eq(botConfigTable.userId, userId))
}

async function runOne(config: BotConfig, log: (m: string) => void) {
  const { userId } = config
  let ok = true
  let status: string
  let detail: string | undefined
  let skipped = false
  try {
    const result = await runBotForUser(userId, "SCHEDULE")
    skipped = !!result.skipped
    status = result.skipped ?? result.summary ?? ""
    detail = result.detail
  } catch (e) {
    ok = false
    status = e instanceof Error ? e.message : String(e)
  }
  // Jadwalkan ulang dari waktu selesai — juga saat error/skip, supaya tidak macet.
  const next = nextRunAt(new Date(), config.runIntervalMinutes)
  await setNextRun(userId, next)
  log(`user ${userId}: ${ok ? status : `ERROR ${status}`}`)
  if (skipped) return

  const account = await getAccountState(userId, config).catch(() => null)
  await sendRunSummary(userId, {
    ok,
    status,
    detail,
    next,
    intervalMinutes: config.runIntervalMinutes,
    account: account && {
      balance: account.balance,
      openPositions: account.openPositions.length,
      maxOpenPositions: config.maxOpenPositions,
    },
  })
}

/** Jalankan semua user aktif yang jadwalnya <= now. Mengembalikan jumlah user yang diproses. */
export async function runDueBots(log: (m: string) => void): Promise<number> {
  const now = new Date()
  const configs = await db
    .select()
    .from(botConfigTable)
    .where(
      and(
        eq(botConfigTable.enabled, true),
        or(
          isNull(botConfigTable.nextRunAt),
          lte(botConfigTable.nextRunAt, now.toISOString())
        )
      )
    )

  let processed = 0
  for (const config of configs) {
    // Belum punya jadwal (mis. config lama): tetapkan slot berikutnya, jangan langsung jalan.
    if (!config.nextRunAt) {
      await setNextRun(config.userId, nextRunAt(now, config.runIntervalMinutes))
      continue
    }
    await runOne(config, log)
    processed++
  }
  return processed
}

/** Jadwal terdekat di antara semua user aktif — untuk heartbeat worker. */
export async function earliestNextRun(): Promise<Date | null> {
  const rows = await db
    .select({ nextRunAt: botConfigTable.nextRunAt })
    .from(botConfigTable)
    .where(eq(botConfigTable.enabled, true))
  const times = rows
    .map((r) => r.nextRunAt)
    .filter((t): t is string => !!t)
    .sort()
  return times.length ? new Date(times[0]) : null
}

/** Catat penjadwal masih hidup (worker atau cron) — dibaca UI "Worker jalan". */
export async function recordHeartbeat() {
  const next = await earliestNextRun()
  const row = {
    id: SINGLETON_ID,
    lastSeenAt: new Date().toISOString(),
    nextRunAt: next?.toISOString() ?? null,
  }
  await db
    .insert(botWorkerTable)
    .values(row)
    .onConflictDoUpdate({
      target: botWorkerTable.id,
      set: { lastSeenAt: row.lastSeenAt, nextRunAt: row.nextRunAt },
    })
}
