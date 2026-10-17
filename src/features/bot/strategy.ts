import type { OHLCV } from "@/types/trading"
import {
  calculateATR,
  calculateEMA,
  calculateMACD,
  calculateRSI,
} from "@/utils/indicators"
import { TIER_MAX_NOTIONAL, TIER_PRIORITY } from "./constants"
import type { Tier } from "./constants"

/**
 * Strategi: hanya LONG searah tren 4H, masuk saat pullback ke EMA20 terkonfirmasi.
 * Semua fungsi di file ini murni (tanpa DB / network) supaya bisa dites.
 */

export type Trend = "UP" | "DOWN" | "UNCLEAR"

/** Tahap hasil analisis — dipakai untuk mengelompokkan ringkasan per-simbol (Telegram). */
export type Stage =
  | "NO_DATA"
  | "TREND_DOWN"
  | "TREND_UNCLEAR"
  | "NO_PULLBACK"
  | "UNCONFIRMED"
  | "STOP_TOO_WIDE"
  | "SETUP"

export interface Snapshot {
  price: number
  ema20: number
  ema50: number
  ema200: number
  rsi: number
  macdHist: number
  macdHistPrev: number
  atr: number
  candleTime: number
}

export interface AnalysisResult {
  snapshot: Snapshot | null
  trend: Trend
  stage: Stage
  setup: boolean
  reason: string
  stopLoss?: number
  takeProfit?: number
}

const MIN_CANDLES = 210
const PULLBACK_LOOKBACK = 3
/** Toleransi "menyentuh" EMA20: low boleh 0.3% di atas EMA20. */
const EMA_TOUCH_TOLERANCE = 1.003
const RSI_MIN = 40
const RSI_MAX = 70
const STOP_ATR_BUFFER = 0.25
const MAX_STOP_ATR = 3
const REWARD_RISK = 2

export function closedCandles(
  candles: OHLCV[],
  closeTimes: number[],
  now: number
): OHLCV[] {
  return candles.filter((_, i) => closeTimes[i] <= now)
}

export function classifyTrend(
  price: number,
  ema20: number,
  ema50: number,
  ema200: number
): Trend {
  if (price > ema20 && ema20 > ema50 && ema50 > ema200) return "UP"
  if (ema20 < ema50 && ema50 < ema200 && price < ema50) return "DOWN"
  return "UNCLEAR"
}

function fmt(n: number): string {
  return n >= 100 ? n.toFixed(2) : n.toPrecision(5)
}

/** Analisis candle 4H yang SUDAH close (candle yang masih berjalan harus dibuang dulu). */
export function analyze(candles: OHLCV[]): AnalysisResult {
  if (candles.length < MIN_CANDLES) {
    return {
      snapshot: null,
      trend: "UNCLEAR",
      stage: "NO_DATA",
      setup: false,
      reason: `Data kurang (${candles.length} candle, butuh ${MIN_CANDLES}).`,
    }
  }

  const closes = candles.map((c) => c.close)
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)
  const rsi = calculateRSI(closes, 14)
  const { histogram } = calculateMACD(closes)
  const atr = calculateATR(candles, 14)

  const last = candles.length - 1
  const c = candles[last]
  const snapshot: Snapshot = {
    price: c.close,
    ema20: ema20[last],
    ema50: ema50[last],
    ema200: ema200[last],
    rsi: rsi[last],
    macdHist: histogram[last],
    macdHistPrev: histogram[last - 1],
    atr: atr[last],
    candleTime: c.time,
  }

  const trend = classifyTrend(
    snapshot.price,
    snapshot.ema20,
    snapshot.ema50,
    snapshot.ema200
  )
  if (trend === "DOWN") {
    return {
      snapshot,
      trend,
      stage: "TREND_DOWN",
      setup: false,
      reason: "Tren 4H turun (EMA20 < EMA50 < EMA200) — tetap cash.",
    }
  }
  if (trend === "UNCLEAR") {
    return {
      snapshot,
      trend,
      stage: "TREND_UNCLEAR",
      setup: false,
      reason:
        "Tren 4H tidak jelas (harga/EMA tidak tersusun naik) — tetap cash.",
    }
  }

  const recent = candles.slice(-PULLBACK_LOOKBACK)
  const touched = recent.some(
    (k, i) =>
      k.low <= ema20[last - (PULLBACK_LOOKBACK - 1) + i] * EMA_TOUCH_TOLERANCE
  )
  if (!touched) {
    return {
      snapshot,
      trend,
      stage: "NO_PULLBACK",
      setup: false,
      reason: `Uptrend, tapi belum ada pullback ke EMA20 dalam ${PULLBACK_LOOKBACK} candle terakhir — tunggu.`,
    }
  }

  const failures: string[] = []
  if (c.close <= c.open) failures.push("candle terakhir bukan candle naik")
  if (c.close <= snapshot.ema20)
    failures.push("close belum kembali di atas EMA20")
  if (!(snapshot.macdHist > snapshot.macdHistPrev))
    failures.push("histogram MACD belum naik")
  if (snapshot.rsi < RSI_MIN || snapshot.rsi > RSI_MAX)
    failures.push(
      `RSI ${snapshot.rsi.toFixed(1)} di luar ${RSI_MIN}–${RSI_MAX}`
    )
  if (failures.length > 0) {
    return {
      snapshot,
      trend,
      stage: "UNCONFIRMED",
      setup: false,
      reason: `Uptrend + pullback, tapi belum terkonfirmasi: ${failures.join("; ")}.`,
    }
  }

  const swingLow = Math.min(...recent.map((k) => k.low))
  const stopLoss = swingLow - STOP_ATR_BUFFER * snapshot.atr
  const risk = c.close - stopLoss
  if (risk <= 0 || risk > MAX_STOP_ATR * snapshot.atr) {
    return {
      snapshot,
      trend,
      stage: "STOP_TOO_WIDE",
      setup: false,
      reason: `Setup valid tapi stop-loss terlalu jauh (${(risk / snapshot.atr).toFixed(1)}× ATR) — lewati.`,
    }
  }
  const takeProfit = c.close + REWARD_RISK * risk

  return {
    snapshot,
    trend,
    stage: "SETUP",
    setup: true,
    stopLoss,
    takeProfit,
    reason: `Uptrend 4H, pullback ke EMA20 terkonfirmasi (close ${fmt(c.close)} > EMA20 ${fmt(snapshot.ema20)}, RSI ${snapshot.rsi.toFixed(1)}, MACD hist naik). SL ${fmt(stopLoss)}, TP ${fmt(takeProfit)} (${REWARD_RISK}R).`,
  }
}

export interface OrderPlan {
  symbol: string
  tier: Tier
  side: "LONG"
  leverage: 1
  entryPrice: number
  stopLoss: number
  takeProfit: number
  notional: number
  quantity: number
}

export function buildOrderPlan(
  symbol: string,
  tier: Tier,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): OrderPlan {
  const notional = TIER_MAX_NOTIONAL[tier]
  return {
    symbol,
    tier,
    side: "LONG",
    leverage: 1,
    entryPrice,
    stopLoss,
    takeProfit,
    notional,
    quantity: notional / entryPrice,
  }
}

export interface ComplianceContext {
  ordersToday: number
  maxOrdersPerDay: number
  openPositions: number
  maxOpenPositions: number
  openSymbols: string[]
  availableBalance: number
  expired: boolean
}

export interface ComplianceCheck {
  longOnly: boolean
  leverage1x: boolean
  stopLossSet: boolean
  withinDailyOrders: boolean
  withinOpenPositions: boolean
  withinTierSize: boolean
  noDuplicateSymbol: boolean
  enoughBalance: boolean
  notExpired: boolean
  passed: boolean
}

export const COMPLIANCE_LABELS: Record<
  Exclude<keyof ComplianceCheck, "passed">,
  string
> = {
  longOnly: "Long only",
  leverage1x: "Leverage 1x",
  stopLossSet: "Stop-loss terpasang",
  withinDailyOrders: "Batas order harian",
  withinOpenPositions: "Batas posisi terbuka",
  withinTierSize: "Ukuran sesuai tier",
  noDuplicateSymbol: "Tidak dobel simbol",
  enoughBalance: "Saldo cukup",
  notExpired: "Strategi belum kedaluwarsa",
}

export function checkCompliance(
  plan: OrderPlan,
  ctx: ComplianceContext
): ComplianceCheck {
  const checks = {
    // Tipe sudah mengunci LONG / 1x; tetap dicek saat runtime sebagai pengaman terakhir.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    longOnly: plan.side === "LONG",
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    leverage1x: plan.leverage === 1,
    stopLossSet:
      Number.isFinite(plan.stopLoss) &&
      plan.stopLoss > 0 &&
      plan.stopLoss < plan.entryPrice,
    withinDailyOrders: ctx.ordersToday < ctx.maxOrdersPerDay,
    withinOpenPositions: ctx.openPositions < ctx.maxOpenPositions,
    withinTierSize: plan.notional <= TIER_MAX_NOTIONAL[plan.tier] + 1e-9,
    noDuplicateSymbol: !ctx.openSymbols.includes(plan.symbol),
    enoughBalance: ctx.availableBalance >= plan.notional,
    notExpired: !ctx.expired,
  }
  return { ...checks, passed: Object.values(checks).every(Boolean) }
}

export function failedChecks(check: ComplianceCheck): string[] {
  return (Object.keys(COMPLIANCE_LABELS) as (keyof typeof COMPLIANCE_LABELS)[])
    .filter((k) => !check[k])
    .map((k) => COMPLIANCE_LABELS[k])
}

/** Setup valid diurutkan sesuai prioritas tier (CORE dulu), stabil terhadap urutan input. */
export function sortByTierPriority<T extends { tier: Tier }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier]
  )
}

export interface ExitResult {
  reason: "STOP" | "TP"
  price: number
  time: number
}

/**
 * Cek apakah stop-loss / take-profit tersentuh sejak posisi dibuka.
 * Kalau keduanya tersentuh di candle yang sama, diasumsikan STOP (konservatif).
 */
export function checkExit(
  position: { stopLoss: number; takeProfit: number; openedAt: number },
  candles: OHLCV[],
  intervalMs: number
): ExitResult | null {
  for (const k of candles) {
    // Lewati candle yang sudah close sebelum posisi dibuka.
    if (k.time + intervalMs <= position.openedAt) continue
    if (k.low <= position.stopLoss)
      return { reason: "STOP", price: position.stopLoss, time: k.time }
    if (k.high >= position.takeProfit)
      return { reason: "TP", price: position.takeProfit, time: k.time }
  }
  return null
}
