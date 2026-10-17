import type { OHLCV } from "@/types/trading"
import type { Snapshot } from "./strategy"

/**
 * Scanner "Serok": cari momen "layak dibeli" di luar strategi pullback ketat
 * (strategy.ts). Murni info/saran — tidak pernah membuka order otomatis.
 * Reuse snapshot (EMA/RSI/MACD/ATR) yang sudah dihitung analyze() supaya tidak
 * fetch/hitung ulang indikator.
 */

export type SerokZone = "STRONG_BUY" | "BUY" | "NONE"

export interface SerokResult {
  score: number
  zone: SerokZone
  reasons: string[]
  dropFromHighPct: number
  stopLoss: number
  takeProfit: number
}

/** ~7 hari candle 4H, dipakai sebagai acuan "high baru-baru ini". */
const HIGH_LOOKBACK = 42
export const SEROK_BUY_SCORE = 60
const SEROK_STRONG_BUY_SCORE = 74
/** Jeda antar alert untuk simbol yang sama walau skor tetap di zona beli. */
export const SEROK_COOLDOWN_MS = 16 * 60 * 60 * 1000

function fmt(n: number): string {
  return n >= 100 ? n.toFixed(2) : n.toPrecision(5)
}

export function scoreSerokSetup(
  candles: OHLCV[],
  snapshot: Snapshot
): SerokResult {
  const { price, ema20, ema50, ema200, rsi, macdHist, macdHistPrev, atr } =
    snapshot
  let score = 50
  const reasons: string[] = []

  if (rsi < 25) {
    score += 22
    reasons.push(`RSI ${rsi.toFixed(0)} — sangat oversold, peluang rebound besar`)
  } else if (rsi < 35) {
    score += 14
    reasons.push(`RSI ${rsi.toFixed(0)} — oversold, area menarik`)
  } else if (rsi < 45) {
    score += 5
    reasons.push(`RSI ${rsi.toFixed(0)} — mendekati area beli`)
  } else if (rsi > 75) {
    score -= 22
    reasons.push(`RSI ${rsi.toFixed(0)} — sangat overbought, risiko koreksi`)
  } else if (rsi > 65) {
    score -= 12
    reasons.push(`RSI ${rsi.toFixed(0)} — mulai overbought`)
  }

  if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
    score += 18
    reasons.push("Uptrend 4H kuat (harga > EMA20 > EMA50 > EMA200)")
  } else if (price > ema50) {
    score += 7
    reasons.push("Masih di atas EMA50")
  } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
    score -= 18
    reasons.push("Downtrend 4H (harga di bawah semua EMA)")
  } else {
    score -= 7
  }

  if (macdHist > macdHistPrev && macdHist > 0) {
    score += 14
    reasons.push("MACD histogram naik di zona positif — momentum balik naik")
  } else if (macdHist > macdHistPrev) {
    score += 7
    reasons.push("MACD histogram mulai naik")
  } else if (macdHist < macdHistPrev && macdHist < 0) {
    score -= 14
  }

  const recentHigh = Math.max(...candles.slice(-HIGH_LOOKBACK).map((c) => c.high))
  const dropFromHighPct =
    recentHigh > 0 ? ((recentHigh - price) / recentHigh) * 100 : 0
  if (dropFromHighPct >= 15) {
    score += 14
    reasons.push(`Turun ${dropFromHighPct.toFixed(1)}% dari high 7 hari — area diskon`)
  } else if (dropFromHighPct >= 8) {
    score += 8
    reasons.push(`Turun ${dropFromHighPct.toFixed(1)}% dari high 7 hari`)
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const zone: SerokZone =
    score >= SEROK_STRONG_BUY_SCORE
      ? "STRONG_BUY"
      : score >= SEROK_BUY_SCORE
        ? "BUY"
        : "NONE"

  const stopLoss = price - 1.5 * atr
  const takeProfit = price + 2 * (price - stopLoss)

  return {
    score,
    zone,
    reasons: reasons.slice(0, 4),
    dropFromHighPct,
    stopLoss,
    takeProfit,
  }
}

export function formatSerokBody(price: number, r: SerokResult): string {
  const lines = [
    `Harga ${fmt(price)} (turun ${r.dropFromHighPct.toFixed(1)}% dari high 7 hari).`,
    ...r.reasons,
    `Saran: SL ${fmt(r.stopLoss)}, TP ${fmt(r.takeProfit)}.`,
    "Ini bukan order otomatis — review manual sebelum masuk.",
  ]
  return lines.join(" ")
}
