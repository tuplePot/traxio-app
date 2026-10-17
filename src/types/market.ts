import type { OHLCV } from "./trading"

export const MARKET_INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const
export type MarketInterval = (typeof MARKET_INTERVALS)[number]

export type CandleSource =
  | "binance"
  | "binance-futures"
  | "bybit"
  | "okx"
  | "gate"
  | "coingecko"
  | "yahoo"

export interface CandleResult {
  candles: OHLCV[]
  source: CandleSource | null
  /** Simbol yang dipakai di sumber data (mis. ETHUSDT, HYPE_USDT). */
  sourceSymbol: string | null
  /** Mata uang harga candle — IDR untuk saham IDX & pair *IDR. */
  currency: "USD" | "IDR"
}
