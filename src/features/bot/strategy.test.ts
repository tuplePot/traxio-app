import { describe, expect, it } from "vitest"
import type { OHLCV } from "@/types/trading"
import { calculateEMA } from "@/utils/indicators"
import { nextRunAt } from "./constants"
import {
  analyze,
  buildOrderPlan,
  checkCompliance,
  checkExit,
  classifyTrend,
  failedChecks,
  sortByTierPriority,
} from "./strategy"
import type { ComplianceContext } from "./strategy"

const H4 = 4 * 60 * 60 * 1000

/** Tren dengan drift per candle dan osilasi naik-turun supaya RSI tidak mentok 100. */
function trendCandles(n: number, drift: number, start = 100): OHLCV[] {
  const out: OHLCV[] = []
  let prev = start
  for (let i = 0; i < n; i++) {
    const close = start + drift * i + (i % 2 === 0 ? 0.6 : -0.6)
    const open = prev
    out.push({
      time: i * H4,
      open,
      close,
      high: Math.max(open, close) + 0.2,
      low: Math.min(open, close) - 0.2,
      volume: 1,
    })
    prev = close
  }
  return out
}

function withCandle(
  candles: OHLCV[],
  open: number,
  close: number,
  low: number,
  high?: number
): OHLCV[] {
  const time = candles[candles.length - 1].time + H4
  return [
    ...candles,
    {
      time,
      open,
      close,
      low,
      high: high ?? Math.max(open, close) + 0.1,
      volume: 1,
    },
  ]
}

const okCtx: ComplianceContext = {
  ordersToday: 0,
  maxOrdersPerDay: 3,
  openPositions: 0,
  maxOpenPositions: 2,
  openSymbols: [],
  availableBalance: 10000,
  expired: false,
}

describe("classifyTrend", () => {
  it("UP hanya bila harga > EMA20 > EMA50 > EMA200", () => {
    expect(classifyTrend(110, 105, 100, 95)).toBe("UP")
    expect(classifyTrend(104, 105, 100, 95)).toBe("UNCLEAR")
  })
  it("DOWN bila EMA tersusun turun dan harga di bawah EMA50", () => {
    expect(classifyTrend(90, 95, 100, 105)).toBe("DOWN")
    expect(classifyTrend(101, 95, 100, 105)).toBe("UNCLEAR")
  })
})

describe("analyze", () => {
  it("menolak kalau data kurang", () => {
    const r = analyze(trendCandles(50, 0.5))
    expect(r.setup).toBe(false)
    expect(r.reason).toMatch(/Data kurang/)
  })

  it("downtrend → tidak ada setup (tetap cash)", () => {
    const r = analyze(trendCandles(300, -0.5, 400))
    expect(r.trend).toBe("DOWN")
    expect(r.setup).toBe(false)
  })

  it("uptrend tanpa pullback → tunggu", () => {
    const r = analyze(trendCandles(300, 0.5))
    expect(r.trend).toBe("UP")
    expect(r.setup).toBe(false)
    expect(r.reason).toMatch(/belum ada pullback/)
  })

  it("uptrend + pullback ke EMA20 + candle konfirmasi → setup LONG dengan SL di bawah entry", () => {
    let candles = trendCandles(300, 0.5)
    const ema20 = calculateEMA(
      candles.map((c) => c.close),
      20
    ).at(-1)!
    const lastClose = candles.at(-1)!.close
    // Dua candle turun menyentuh EMA20, lalu satu candle naik close di atas EMA20.
    candles = withCandle(candles, lastClose, ema20 + 1.5, ema20 + 1)
    candles = withCandle(candles, ema20 + 1.5, ema20 + 0.6, ema20 - 0.3)
    candles = withCandle(candles, ema20 + 0.6, ema20 + 3, ema20 + 0.4)

    const r = analyze(candles)
    expect(r.trend).toBe("UP")
    expect(r.setup).toBe(true)
    expect(r.stopLoss!).toBeLessThan(r.snapshot!.price)
    expect(r.takeProfit!).toBeGreaterThan(r.snapshot!.price)
    // TP = 2R
    const risk = r.snapshot!.price - r.stopLoss!
    expect(r.takeProfit! - r.snapshot!.price).toBeCloseTo(2 * risk, 6)
  })
})

describe("buildOrderPlan + checkCompliance", () => {
  it("ukuran posisi mengikuti batas tier dan selalu LONG 1x", () => {
    const core = buildOrderPlan("BTC", "CORE", 100, 95, 110)
    const growth = buildOrderPlan("SUI", "GROWTH", 2, 1.9, 2.2)
    const spec = buildOrderPlan("X", "SPEC", 1, 0.9, 1.2)
    expect([core.notional, growth.notional, spec.notional]).toEqual([
      50, 30, 20,
    ])
    expect(core.side).toBe("LONG")
    expect(core.leverage).toBe(1)
    expect(core.quantity).toBeCloseTo(0.5)
  })

  it("lolos semua cek dalam kondisi normal", () => {
    expect(
      checkCompliance(buildOrderPlan("BTC", "CORE", 100, 95, 110), okCtx).passed
    ).toBe(true)
  })

  it("blokir saat batas order harian / posisi / simbol dobel / saldo / kedaluwarsa", () => {
    const plan = buildOrderPlan("BTC", "CORE", 100, 95, 110)
    expect(
      checkCompliance(plan, { ...okCtx, ordersToday: 3 }).withinDailyOrders
    ).toBe(false)
    expect(
      checkCompliance(plan, { ...okCtx, openPositions: 2 }).withinOpenPositions
    ).toBe(false)
    expect(
      checkCompliance(plan, { ...okCtx, openSymbols: ["BTC"] })
        .noDuplicateSymbol
    ).toBe(false)
    expect(
      checkCompliance(plan, { ...okCtx, availableBalance: 10 }).enoughBalance
    ).toBe(false)
    const expired = checkCompliance(plan, { ...okCtx, expired: true })
    expect(expired.passed).toBe(false)
    expect(failedChecks(expired)).toEqual(["Strategi belum kedaluwarsa"])
  })

  it("blokir stop-loss yang tidak valid dan ukuran melebihi tier", () => {
    expect(
      checkCompliance(buildOrderPlan("BTC", "CORE", 100, 101, 110), okCtx)
        .stopLossSet
    ).toBe(false)
    const oversized = {
      ...buildOrderPlan("SUI", "GROWTH", 2, 1.9, 2.2),
      notional: 50,
    }
    expect(checkCompliance(oversized, okCtx).withinTierSize).toBe(false)
  })
})

describe("sortByTierPriority", () => {
  it("CORE didahulukan dari GROWTH dan SPEC", () => {
    const sorted = sortByTierPriority([
      { s: "a", tier: "SPEC" as const },
      { s: "b", tier: "CORE" as const },
      { s: "c", tier: "GROWTH" as const },
    ])
    expect(sorted.map((x) => x.tier)).toEqual(["CORE", "GROWTH", "SPEC"])
  })
})

describe("checkExit", () => {
  const pos = {
    stopLoss: 95,
    takeProfit: 110,
    openedAt: 2 * H4 + 5 * 60 * 1000,
  }
  const k = (i: number, low: number, high: number): OHLCV => ({
    time: i * H4,
    open: 100,
    close: 100,
    low,
    high,
    volume: 1,
  })

  it("abaikan candle yang sudah close sebelum posisi dibuka", () => {
    expect(
      checkExit(pos, [k(0, 90, 120), k(1, 90, 120), k(2, 99, 101)], H4)
    ).toBeNull()
  })
  it("kena stop-loss", () => {
    expect(checkExit(pos, [k(2, 99, 101), k(3, 94, 101)], H4)).toMatchObject({
      reason: "STOP",
      price: 95,
    })
  })
  it("kena take-profit", () => {
    expect(checkExit(pos, [k(2, 99, 101), k(3, 99, 111)], H4)).toMatchObject({
      reason: "TP",
      price: 110,
    })
  })
  it("SL dan TP di candle yang sama → diasumsikan STOP", () => {
    expect(checkExit(pos, [k(3, 94, 111)], H4)?.reason).toBe("STOP")
  })
})

describe("nextRunAt", () => {
  it("5 menit setelah close candle 4H berikutnya (UTC)", () => {
    expect(nextRunAt(new Date("2026-10-16T08:04:00Z")).toISOString()).toBe(
      "2026-10-16T08:05:00.000Z"
    )
    expect(nextRunAt(new Date("2026-10-16T08:05:00Z")).toISOString()).toBe(
      "2026-10-16T12:05:00.000Z"
    )
    expect(nextRunAt(new Date("2026-10-16T21:00:00Z")).toISOString()).toBe(
      "2026-10-17T00:05:00.000Z"
    )
    expect(nextRunAt(new Date("2026-10-16T00:02:00Z")).toISOString()).toBe(
      "2026-10-16T00:05:00.000Z"
    )
  })
  it("interval custom", () => {
    expect(
      nextRunAt(new Date("2026-10-16T08:04:30Z"), 1).toISOString()
    ).toBe("2026-10-16T08:05:00.000Z")
    expect(
      nextRunAt(new Date("2026-10-16T08:05:00Z"), 15).toISOString()
    ).toBe("2026-10-16T08:15:00.000Z")
    expect(
      nextRunAt(new Date("2026-10-16T08:05:00Z"), 60).toISOString()
    ).toBe("2026-10-16T09:05:00.000Z")
  })
})
