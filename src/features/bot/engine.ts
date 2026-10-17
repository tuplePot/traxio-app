import { and, eq, gte } from "drizzle-orm"
import { db, first, one } from "@/db"
import {
  botConfigTable,
  botDecisionsTable,
  botRunsTable,
  botSymbolsTable,
  notificationsTable,
  paperPositionsTable,
  serokStateTable,
  tradesTable,
} from "@/db/schema"
import type { BotConfig, NewBotDecision, PaperPosition, SerokState } from "@/db/schema"
import { isLlmConfigured, LLM_MODEL } from "@/lib/llm"
import { parseGoogleNewsXml } from "@/features/news/utils"
import { sendTelegramAlert } from "@/features/telegram/alerts"
import { sendPushAlert } from "@/features/notifications/push-alerts"
import { SYMBOL_NAMES } from "@/features/watchlist/constants"
import type { OHLCV } from "@/types/trading"
import { reviewSetup } from "./ai-review"
import {
  CANDLE_INTERVAL,
  CANDLE_LIMIT,
  DEFAULT_EXPIRY_DAYS,
  QUOTE_ASSET,
} from "./constants"
import type { Tier } from "./constants"
import {
  SEROK_BUY_SCORE,
  SEROK_COOLDOWN_MS,
  formatSerokBody,
  scoreSerokSetup,
} from "./serok"
import type { SerokZone } from "./serok"
import {
  analyze,
  buildOrderPlan,
  checkCompliance,
  checkExit,
  closedCandles,
  failedChecks,
  sortByTierPriority,
} from "./strategy"
import type { AnalysisResult } from "./strategy"

const INTERVAL_MS = 4 * 60 * 60 * 1000
/** Run yang masih RUNNING lebih lama dari ini dianggap macet. */
const STALE_RUN_MS = 10 * 60 * 1000

export interface CandleSeries {
  /** Semua candle termasuk yang masih berjalan (untuk cek SL/TP). */
  all: OHLCV[]
  /** Hanya candle yang sudah close (untuk analisis). */
  closed: OHLCV[]
}

export async function fetchCandles(
  symbol: string,
  now = Date.now()
): Promise<CandleSeries> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}${QUOTE_ASSET}&interval=${CANDLE_INTERVAL}&limit=${CANDLE_LIMIT}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      res.status === 400
        ? `${symbol}${QUOTE_ASSET} tidak tersedia di Binance`
        : `Binance HTTP ${res.status}`
    )
  }
  const raw = (await res.json()) as (string | number)[][]
  const all: OHLCV[] = raw.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }))
  const closeTimes = raw.map((k) => Number(k[6]))
  return { all, closed: closedCandles(all, closeTimes, now) }
}

async function fetchHeadlines(symbol: string): Promise<string[]> {
  const name = SYMBOL_NAMES[symbol] ?? symbol
  const url = new URL("https://news.google.com/rss/search")
  url.searchParams.set("q", `${symbol} crypto OR "${name}" when:2d`)
  url.searchParams.set("hl", "en-US")
  url.searchParams.set("gl", "US")
  url.searchParams.set("ceid", "US:en")
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    if (!res.ok) return []
    return parseGoogleNewsXml(await res.text())
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 8)
      .map((n) => `${n.publishedAt.slice(0, 10)} — ${n.title}`)
  } catch {
    return []
  }
}

export async function getOrCreateConfig(userId: string): Promise<BotConfig> {
  const existing = await db
    .select()
    .from(botConfigTable)
    .where(eq(botConfigTable.userId, userId))
    .then(first)
  if (existing) return existing
  const expiresAt = new Date(
    Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  return (await db
    .insert(botConfigTable)
    .values({ userId, expiresAt })
    .returning()
    .then(one))
}

export function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

export interface AccountState {
  balance: number
  realizedPnl: number
  openNotional: number
  available: number
  openPositions: PaperPosition[]
  ordersToday: number
}

export async function getAccountState(
  userId: string,
  config: BotConfig,
  now = new Date()
): Promise<AccountState> {
  const positions = await db
    .select()
    .from(paperPositionsTable)
    .where(eq(paperPositionsTable.userId, userId))
  const openPositions = positions.filter((p) => p.status === "OPEN")
  const realizedPnl = positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0)
  const openNotional = openPositions.reduce((sum, p) => sum + p.notional, 0)
  const balance = config.startingBalance + realizedPnl
  const dayStart = startOfUtcDay(now).toISOString()
  const ordersToday = positions.filter((p) => p.openedAt >= dayStart).length
  return {
    balance,
    realizedPnl,
    openNotional,
    available: balance - openNotional,
    openPositions,
    ordersToday,
  }
}

async function notify(
  userId: string,
  type: "BUY" | "EXIT" | "INFO" | "ERROR" | "SEROK",
  title: string,
  body: string
) {
  const { id } = await db
    .insert(notificationsTable)
    .values({ userId, type, title, body, createdAt: new Date().toISOString() })
    .returning({ id: notificationsTable.id })
    .then(one)
  await Promise.all([
    sendTelegramAlert(userId, type, title, body),
    // Tag sama dengan notifikasi dari tab web → perangkat tidak menampilkan dobel.
    sendPushAlert(userId, { id, type, title, body, tag: `traxio-${id}` }),
  ])
}

function fmtPrice(n: number): string {
  return n >= 100 ? n.toFixed(2) : n.toPrecision(5)
}

async function closePosition(
  position: PaperPosition,
  exitPrice: number,
  exitReason: "STOP" | "TP" | "MANUAL",
  closedAt: Date
) {
  const pnl = position.quantity * (exitPrice - position.entryPrice)
  await db
    .update(paperPositionsTable)
    .set({
      status: "CLOSED",
      exitPrice,
      exitReason,
      pnl,
      closedAt: closedAt.toISOString(),
    })
    .where(eq(paperPositionsTable.id, position.id))
  if (position.tradeId != null) {
    const outcome =
      Math.abs(pnl) < 1e-9 ? "BREAKEVEN" : pnl > 0 ? "WIN" : "LOSS"
    await db
      .update(tradesTable)
      .set({
        exitPrice,
        outcome,
        riskReward:
          Math.round(
            Math.abs(
              (exitPrice - position.entryPrice) /
                (position.entryPrice - position.stopLoss)
            ) * 100
          ) / 100,
        closedAt: closedAt.toISOString(),
      })
      .where(eq(tradesTable.id, position.tradeId))
  }
  return pnl
}

export async function closePositionManually(
  userId: string,
  positionId: string
) {
  const position = await db
    .select()
    .from(paperPositionsTable)
    .where(
      and(
        eq(paperPositionsTable.id, positionId),
        eq(paperPositionsTable.userId, userId)
      )
    )
    .then(first)
  if (!position || position.status !== "OPEN")
    throw new Error("Posisi tidak ditemukan atau sudah ditutup")
  const { all } = await fetchCandles(position.symbol)
  const price = all[all.length - 1].close
  const pnl = await closePosition(position, price, "MANUAL", new Date())
  await notify(
    userId,
    "EXIT",
    `${position.symbol} ditutup manual`,
    `Paper trade ditutup di ${fmtPrice(price)}. PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USD.`
  )
  return { price, pnl }
}

export interface RunResult {
  runId: string | null
  skipped?: string
  summary?: string
  /** Breakdown per-simbol (near signal, diblokir, serok, dst) — khusus Telegram. */
  detail?: string
}

/**
 * Satu siklus bot untuk satu user: kelola posisi terbuka (SL/TP), analisis
 * watchlist, cek kepatuhan, review AI, lalu buka paper trade bila semua lolos.
 */
export async function runBotForUser(
  userId: string,
  trigger: "SCHEDULE" | "MANUAL"
): Promise<RunResult> {
  const now = new Date()
  const config = await getOrCreateConfig(userId)
  if (trigger === "SCHEDULE" && !config.enabled)
    return { runId: null, skipped: "Bot nonaktif" }

  const running = await db
    .select()
    .from(botRunsTable)
    .where(
      and(
        eq(botRunsTable.userId, userId),
        eq(botRunsTable.status, "RUNNING"),
        gte(
          botRunsTable.startedAt,
          new Date(now.getTime() - STALE_RUN_MS).toISOString()
        )
      )
    )
    .then(first)
  if (running) return { runId: null, skipped: "Masih ada run yang berjalan" }

  // Tandai run lama yang macet supaya tidak menggantung selamanya.
  await db
    .update(botRunsTable)
    .set({
      status: "ERROR",
      error: "Run terhenti sebelum selesai",
      finishedAt: now.toISOString(),
    })
    .where(
      and(eq(botRunsTable.userId, userId), eq(botRunsTable.status, "RUNNING"))
    )

  const aiActive = config.aiEnabled && isLlmConfigured()
  const run = (await db
    .insert(botRunsTable)
    .values({
      userId,
      trigger,
      status: "RUNNING",
      startedAt: now.toISOString(),
      aiModel: aiActive ? LLM_MODEL : null,
    })
    .returning()
    .then(one))

  try {
    const { summary, detail } = await executeRun(
      userId,
      run.id,
      config,
      aiActive,
      now
    )
    await db
      .update(botRunsTable)
      .set({ status: "OK", summary, finishedAt: new Date().toISOString() })
      .where(eq(botRunsTable.id, run.id))
    return { runId: run.id, summary, detail }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await db
      .update(botRunsTable)
      .set({
        status: "ERROR",
        error: message,
        finishedAt: new Date().toISOString(),
      })
      .where(eq(botRunsTable.id, run.id))
    await notify(userId, "ERROR", "Bot gagal berjalan", message)
    throw e
  }
}

interface BreakdownParts {
  openedSymbols: string[]
  closedItems: { symbol: string; reason: "STOP" | "TP" | "MANUAL"; pnl: number }[]
  nearItems: { symbol: string; reason: string }[]
  blockedItems: { symbol: string; reason: string }[]
  serokItems: { symbol: string; score: number; zone: SerokZone }[]
  watchSymbols: string[]
  downSymbols: string[]
  unclearSymbols: string[]
  errorItems: { symbol: string; reason: string }[]
}

function buildBreakdown(p: BreakdownParts): string {
  const sections: string[] = []
  if (p.openedSymbols.length)
    sections.push(`🟢 Order dibuka: ${p.openedSymbols.join(", ")}`)
  if (p.closedItems.length)
    sections.push(
      `🔴 Posisi ditutup: ${p.closedItems
        .map(
          (c) =>
            `${c.symbol} kena ${c.reason === "TP" ? "TP" : c.reason === "STOP" ? "SL" : "manual"} (${c.pnl >= 0 ? "+" : ""}${c.pnl.toFixed(2)} USD)`
        )
        .join(", ")}`
    )
  if (p.nearItems.length)
    sections.push(
      `🔎 Dekat sinyal:\n${p.nearItems.map((n) => `• ${n.symbol}: ${n.reason}`).join("\n")}`
    )
  if (p.blockedItems.length)
    sections.push(
      `⛔ Setup valid tapi tidak eksekusi:\n${p.blockedItems.map((b) => `• ${b.symbol}: ${b.reason}`).join("\n")}`
    )
  if (p.serokItems.length)
    sections.push(
      `📡 Serok terpicu: ${p.serokItems
        .map((s) => `${s.symbol} (skor ${s.score}${s.zone === "STRONG_BUY" ? ", strong buy" : ""})`)
        .join(", ")}`
    )
  if (p.watchSymbols.length)
    sections.push(`👀 Uptrend, nunggu pullback: ${p.watchSymbols.join(", ")}`)
  if (p.downSymbols.length) sections.push(`📉 Downtrend: ${p.downSymbols.join(", ")}`)
  if (p.unclearSymbols.length) sections.push(`➖ Netral: ${p.unclearSymbols.join(", ")}`)
  if (p.errorItems.length)
    sections.push(
      `⚠️ Gagal ambil data: ${p.errorItems.map((e) => `${e.symbol} (${e.reason})`).join(", ")}`
    )
  return sections.join("\n\n")
}

async function upsertSerokState(row: {
  userId: string
  symbol: string
  inBuyZone: boolean
  lastScore: number
  lastAlertAt: string | null
}) {
  await db
    .insert(serokStateTable)
    .values({ ...row, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [serokStateTable.userId, serokStateTable.symbol],
      set: {
        inBuyZone: row.inBuyZone,
        lastScore: row.lastScore,
        lastAlertAt: row.lastAlertAt,
        updatedAt: new Date().toISOString(),
      },
    })
}

async function executeRun(
  userId: string,
  runId: string,
  config: BotConfig,
  aiActive: boolean,
  now: Date
): Promise<{ summary: string; detail: string }> {
  const expired = new Date(config.expiresAt).getTime() <= now.getTime()
  const symbols = sortByTierPriority(
    (
      await db
        .select()
        .from(botSymbolsTable)
        .where(eq(botSymbolsTable.userId, userId))
    ).map((s) => ({
      symbol: s.symbol,
      tier: s.tier,
    }))
  )

  const candleCache = new Map<string, CandleSeries | Error>()
  async function candlesFor(symbol: string): Promise<CandleSeries | Error> {
    if (!candleCache.has(symbol)) {
      candleCache.set(
        symbol,
        await fetchCandles(symbol, now.getTime()).catch((e: unknown) =>
          e instanceof Error ? e : new Error(String(e))
        )
      )
    }
    return candleCache.get(symbol)!
  }

  // 1) Kelola posisi terbuka: cek SL / TP.
  let closedCount = 0
  const closedItems: BreakdownParts["closedItems"] = []
  const openBefore = await db
    .select()
    .from(paperPositionsTable)
    .where(
      and(
        eq(paperPositionsTable.userId, userId),
        eq(paperPositionsTable.status, "OPEN")
      )
    )
  for (const position of openBefore) {
    const series = await candlesFor(position.symbol)
    if (series instanceof Error) continue
    const exit = checkExit(
      {
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        openedAt: new Date(position.openedAt).getTime(),
      },
      series.all,
      INTERVAL_MS
    )
    if (!exit) continue
    const pnl = await closePosition(position, exit.price, exit.reason, now)
    closedCount++
    closedItems.push({ symbol: position.symbol, reason: exit.reason, pnl })
    await notify(
      userId,
      "EXIT",
      `${position.symbol} kena ${exit.reason === "TP" ? "take-profit" : "stop-loss"}`,
      `Paper trade ditutup di ${fmtPrice(exit.price)}. PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USD.`
    )
  }

  // 1.5) Serok: scan tiap simbol watchlist untuk sinyal "layak dibeli" di luar
  // strategi pullback ketat — murni info, edge-trigger + cooldown per simbol.
  const serokStateRows = await db
    .select()
    .from(serokStateTable)
    .where(eq(serokStateTable.userId, userId))
  const serokStates = new Map<string, SerokState>(
    serokStateRows.map((r) => [r.symbol, r])
  )
  const serokItems: BreakdownParts["serokItems"] = []

  // 2) Analisis semua simbol watchlist.
  const decisions: NewBotDecision[] = []
  const candidates: { symbol: string; tier: Tier; analysis: AnalysisResult }[] =
    []
  const createdAt = now.toISOString()
  const nearItems: BreakdownParts["nearItems"] = []
  const blockedItems: BreakdownParts["blockedItems"] = []
  const watchSymbols: string[] = []
  const downSymbols: string[] = []
  const unclearSymbols: string[] = []
  const errorItems: BreakdownParts["errorItems"] = []

  for (const { symbol, tier } of symbols) {
    const series = await candlesFor(symbol)
    if (series instanceof Error) {
      decisions.push({
        runId,
        userId,
        symbol,
        tier,
        decision: "DATA_ERROR",
        reason: series.message,
        createdAt,
      })
      errorItems.push({ symbol, reason: series.message })
      continue
    }
    const analysis = analyze(series.closed)

    if (analysis.snapshot) {
      const serokResult = scoreSerokSetup(series.closed, analysis.snapshot)
      const prevState = serokStates.get(symbol)
      const wasInZone = prevState?.inBuyZone ?? false
      const cooldownOk =
        !prevState?.lastAlertAt ||
        now.getTime() - new Date(prevState.lastAlertAt).getTime() >=
          SEROK_COOLDOWN_MS
      const shouldAlert =
        serokResult.score >= SEROK_BUY_SCORE && (!wasInZone || cooldownOk)
      if (shouldAlert) {
        serokItems.push({ symbol, score: serokResult.score, zone: serokResult.zone })
        await notify(
          userId,
          "SEROK",
          `Serok: ${symbol} layak dibeli (skor ${serokResult.score}/100)`,
          formatSerokBody(analysis.snapshot.price, serokResult)
        )
      }
      await upsertSerokState({
        userId,
        symbol,
        inBuyZone: serokResult.zone !== "NONE",
        lastScore: serokResult.score,
        lastAlertAt: shouldAlert ? now.toISOString() : prevState?.lastAlertAt ?? null,
      })
    }

    if (analysis.setup) {
      candidates.push({ symbol, tier, analysis })
    } else {
      decisions.push({
        runId,
        userId,
        symbol,
        tier,
        ...snapshotColumns(analysis),
        decision: "NO_TRADE",
        reason: analysis.reason,
        createdAt,
      })
      switch (analysis.stage) {
        case "TREND_DOWN":
          downSymbols.push(symbol)
          break
        case "TREND_UNCLEAR":
          unclearSymbols.push(symbol)
          break
        case "NO_PULLBACK":
          watchSymbols.push(symbol)
          break
        case "UNCONFIRMED":
        case "STOP_TOO_WIDE":
          nearItems.push({ symbol, reason: analysis.reason })
          break
      }
    }
  }

  // 3) Setup valid (sudah urut CORE > GROWTH > SPEC): cek kepatuhan, review AI, eksekusi.
  const account = await getAccountState(userId, config, now)
  let ordersToday = account.ordersToday
  let openCount = account.openPositions.length
  let available = account.available
  const openSymbols = account.openPositions.map((p) => p.symbol)
  let opened = 0
  const openedSymbols: string[] = []

  for (const { symbol, tier, analysis } of candidates) {
    const snap = analysis.snapshot!
    const plan = buildOrderPlan(
      symbol,
      tier,
      snap.price,
      analysis.stopLoss!,
      analysis.takeProfit!
    )
    const compliance = checkCompliance(plan, {
      ordersToday,
      maxOrdersPerDay: config.maxOrdersPerDay,
      openPositions: openCount,
      maxOpenPositions: config.maxOpenPositions,
      openSymbols,
      availableBalance: available,
      expired,
    })
    const base = {
      runId,
      userId,
      symbol,
      tier,
      ...snapshotColumns(analysis),
      compliance: JSON.stringify(compliance),
      createdAt,
    }

    if (!compliance.passed) {
      const reason = `${analysis.reason} Diblokir aturan: ${failedChecks(compliance).join(", ")}.`
      decisions.push({ ...base, decision: "BLOCKED", reason })
      blockedItems.push({ symbol, reason })
      continue
    }

    let aiFields: {
      aiVerdict?: string
      aiConfidence?: number
      aiReason?: string
    } = {}
    if (aiActive) {
      try {
        const { review } = await reviewSetup({
          plan,
          snapshot: snap,
          headlines: await fetchHeadlines(symbol),
        })
        aiFields = {
          aiVerdict: review.verdict,
          aiConfidence: Math.round(review.confidence),
          aiReason: [
            review.reason,
            ...review.risks.map((r) => `Risiko: ${r}`),
          ].join(" "),
        }
        if (review.verdict !== "APPROVE") {
          const reason = `${analysis.reason} AI: ${review.verdict}.`
          decisions.push({
            ...base,
            ...aiFields,
            decision: review.verdict === "REJECT" ? "AI_REJECTED" : "AI_WAIT",
            reason,
          })
          blockedItems.push({ symbol, reason })
          continue
        }
      } catch (e) {
        const reason = `${analysis.reason} Review AI gagal (${e instanceof Error ? e.message : String(e)}) — tidak masuk demi aman.`
        decisions.push({ ...base, decision: "AI_ERROR", reason })
        blockedItems.push({ symbol, reason })
        continue
      }
    }

    const decision = (await db
      .insert(botDecisionsTable)
      .values({
        ...base,
        ...aiFields,
        decision: "BUY",
        reason: aiActive
          ? analysis.reason
          : `${analysis.reason} ${config.aiEnabled ? "AI aktif tapi API key belum diisi — " : ""}keputusan dari aturan saja.`,
      })
      .returning()
      .then(one))

    const trade = (await db
      .insert(tradesTable)
      .values({
        userId,
        symbol: `${symbol}${QUOTE_ASSET}`,
        direction: "LONG",
        entryPrice: plan.entryPrice,
        stopLoss: plan.stopLoss,
        takeProfit: plan.takeProfit,
        riskReward:
          Math.round(
            Math.abs(
              (plan.takeProfit - plan.entryPrice) /
                (plan.entryPrice - plan.stopLoss)
            ) * 100
          ) / 100,
        setupType: `BOT 4H pullback · ${tier}`,
        emotionNote: "Paper trade otomatis oleh bot Traxio.",
      })
      .returning()
      .then(one))

    await db.insert(paperPositionsTable).values({
      userId,
      symbol,
      tier,
      entryPrice: plan.entryPrice,
      quantity: plan.quantity,
      notional: plan.notional,
      stopLoss: plan.stopLoss,
      takeProfit: plan.takeProfit,
      tradeId: trade.id,
      decisionId: decision.id,
      openedAt: now.toISOString(),
    })

    await notify(
      userId,
      "BUY",
      `Paper BUY ${symbol} (${tier})`,
      `Entry ${fmtPrice(plan.entryPrice)}, SL ${fmtPrice(plan.stopLoss)}, TP ${fmtPrice(plan.takeProfit)}, $${plan.notional} @1x.`
    )

    ordersToday++
    openCount++
    available -= plan.notional
    openSymbols.push(symbol)
    openedSymbols.push(symbol)
    opened++
  }

  if (decisions.length > 0) await db.insert(botDecisionsTable).values(decisions)

  const parts = [
    `${symbols.length} simbol dicek`,
    `${candidates.length} setup valid`,
    `${opened} order dibuka`,
    `${closedCount} posisi ditutup`,
  ]
  if (expired) parts.push("strategi kedaluwarsa — tidak ada entry baru")
  if (symbols.length === 0) parts.push("watchlist bot kosong")

  const detail = buildBreakdown({
    openedSymbols,
    closedItems,
    nearItems,
    blockedItems,
    serokItems,
    watchSymbols,
    downSymbols,
    unclearSymbols,
    errorItems,
  })

  return { summary: parts.join(", "), detail }
}

function snapshotColumns(analysis: AnalysisResult) {
  const s = analysis.snapshot
  return {
    trend: analysis.trend,
    price: s?.price ?? null,
    ema20: s?.ema20 ?? null,
    ema50: s?.ema50 ?? null,
    ema200: s?.ema200 ?? null,
    rsi: s?.rsi ?? null,
    macdHist: s?.macdHist ?? null,
    atr: s?.atr ?? null,
  }
}

/** Dipakai worker: semua user yang botnya aktif. */
export async function getEnabledUserIds(): Promise<string[]> {
  const rows = await db
    .select()
    .from(botConfigTable)
    .where(eq(botConfigTable.enabled, true))
  return rows.map((r) => r.userId)
}
