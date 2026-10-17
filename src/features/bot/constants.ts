export const TIERS = ["CORE", "GROWTH", "SPEC"] as const
export type Tier = (typeof TIERS)[number]

/** Notional maksimum (USD) per posisi untuk tiap tier. Leverage selalu 1x. */
export const TIER_MAX_NOTIONAL: Record<Tier, number> = {
  CORE: 50,
  GROWTH: 30,
  SPEC: 20,
}

/** Urutan prioritas saat beberapa setup valid muncul bersamaan (kecil = didahulukan). */
export const TIER_PRIORITY: Record<Tier, number> = {
  CORE: 0,
  GROWTH: 1,
  SPEC: 2,
}

export const DEFAULT_WATCHLIST: Record<Tier, string[]> = {
  CORE: ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "LINK", "AAVE", "AVAX"],
  GROWTH: ["SUI", "ENA", "RENDER", "POL", "CELO", "HYPE"],
  SPEC: ["ZEREBRO", "PIPPIN", "ZKJ", "ISLM", "AIJ"],
}

export const QUOTE_ASSET = "USDT"
export const CANDLE_INTERVAL = "4h"
/** 500 candle 4H ≈ 83 hari — cukup supaya EMA200 sudah stabil. */
export const CANDLE_LIMIT = 500
export const DEFAULT_EXPIRY_DAYS = 14

/** Pilihan jarak cek terjadwal (menit). 240 = rekomendasi, ikut penutupan candle 4H. */
export const RUN_INTERVAL_OPTIONS = [
  { minutes: 240, label: "Tiap 4 jam (rekomendasi)" },
  { minutes: 60, label: "Tiap 1 jam" },
  { minutes: 15, label: "Tiap 15 menit" },
  { minutes: 5, label: "Tiap 5 menit" },
  { minutes: 1, label: "Tiap 1 menit (testing)" },
] as const
export const RUN_INTERVAL_MINUTES = RUN_INTERVAL_OPTIONS.map((o) => o.minutes)
export const DEFAULT_RUN_INTERVAL = 240

export function intervalLabel(minutes: number): string {
  return minutes < 60 ? `${minutes} menit` : `${minutes / 60} jam`
}

/**
 * Untuk interval >= 1 jam, cek jalan RUN_MINUTE menit setelah candle tutup
 * (4 jam → 00:05, 04:05, ... UTC). Interval di bawah 1 jam tanpa offset.
 */
export const RUN_MINUTE = 5
const MINUTE_MS = 60 * 1000

/** Slot berikutnya setelah `now`: tengah malam UTC + offset + k × interval. */
export function nextRunAt(
  now: Date = new Date(),
  intervalMinutes: number = DEFAULT_RUN_INTERVAL
): Date {
  const intervalMs = intervalMinutes * MINUTE_MS
  const offsetMs = intervalMinutes >= 60 ? RUN_MINUTE * MINUTE_MS : 0
  const anchor =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) +
    offsetMs
  const elapsed = now.getTime() - anchor
  return new Date(anchor + (Math.floor(elapsed / intervalMs) + 1) * intervalMs)
}
