import type { OHLCV } from "@/types/trading"

const DAY_MS = 86_400_000
export const WEEK_MS = 7 * DAY_MS

/** Agregasi candle ke bucket lebih besar (mis. 4h dari 1h, 1w dari 1d). */
export function aggregateCandles(candles: OHLCV[], bucketMs: number): OHLCV[] {
  // Minggu dimulai Senin (epoch 1970-01-01 = Kamis → offset 4 hari)
  const offset = bucketMs === WEEK_MS ? 4 * DAY_MS : 0
  const out: OHLCV[] = []
  for (const c of candles) {
    const bucket = c.time - ((((c.time - offset) % bucketMs) + bucketMs) % bucketMs)
    const last = out.at(-1)
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, c.high)
      last.low = Math.min(last.low, c.low)
      last.close = c.close
      last.volume += c.volume
    } else {
      out.push({ ...c, time: bucket })
    }
  }
  return out
}
