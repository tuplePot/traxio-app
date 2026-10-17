import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import type { OHLCV } from "@/types/trading"
import { aggregateCandles } from "@/utils/candles"

// Map exchange codes → Yahoo Finance suffix
const EXCHANGE_SUFFIX: Record<string, string> = {
  IDX: ".JK",     // Indonesia (BEI/IDX)
  NYSE: "",        // New York Stock Exchange
  NASDAQ: "",      // NASDAQ
  AMEX: "",        // American Stock Exchange
  LSE: ".L",       // London Stock Exchange
  TSE: ".T",       // Tokyo Stock Exchange
  ASX: ".AX",      // Australia Securities Exchange
  TSX: ".TO",      // Toronto Stock Exchange
  HKEX: ".HK",     // Hong Kong Stock Exchange
  SSE: ".SS",      // Shanghai Stock Exchange
  SZSE: ".SZ",     // Shenzhen Stock Exchange
  BSE: ".BO",      // Bombay Stock Exchange
  NSE: ".NS",      // National Stock Exchange India
  SGX: ".SI",      // Singapore Exchange
  KRX: ".KS",      // Korea Exchange
  XETR: ".DE",     // Frankfurt (Xetra)
  EPA: ".PA",      // Euronext Paris
  BIT: ".MI",      // Borsa Italiana
  BME: ".MC",      // Bolsa de Madrid
}

export const YAHOO_EXCHANGES = new Set(Object.keys(EXCHANGE_SUFFIX))

// Map interval strings to Yahoo Finance interval format
const INTERVAL_MAP: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "60m",
  "4h": "60m",  // Yahoo tidak punya 4h → ambil 60m lalu diagregasi
  "1d": "1d",
  "1w": "1wk",
  "1wk": "1wk",
  "1mo": "1mo",
}

// Map interval to range (how far back to fetch)
const RANGE_MAP: Record<string, string> = {
  "1m": "7d",
  "5m": "60d",
  "15m": "60d",
  "30m": "60d",
  "1h": "730d",
  "4h": "730d",
  "1d": "5y",
  "1w": "10y",
  "1wk": "10y",
  "1mo": "10y",
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export function getYahooTicker(symbol: string, exchange: string): string {
  const suffix = EXCHANGE_SUFFIX[exchange.toUpperCase()] ?? ""
  return `${symbol}${suffix}`
}

export async function getYahooCandles(
  symbol: string,
  exchange: string,
  interval: string,
): Promise<OHLCV[]> {
  const ticker = getYahooTicker(symbol, exchange)
  const yInterval = INTERVAL_MAP[interval] ?? "1d"
  const range = RANGE_MAP[interval] ?? "1y"

  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`)
  url.searchParams.set("interval", yInterval)
  url.searchParams.set("range", range)
  url.searchParams.set("includePrePost", "false")

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    })

    if (!res.ok) return []

    const json = await res.json() as {
      chart?: {
        result?: Array<{
          timestamp?: number[]
          indicators?: {
            quote?: Array<{
              open?: (number | null)[]
              high?: (number | null)[]
              low?: (number | null)[]
              close?: (number | null)[]
              volume?: (number | null)[]
            }>
          }
        }>
        error?: { code: string; description: string }
      }
    }

    const result = json?.chart?.result?.[0]
    if (!result) return []

    const timestamps = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0]
    if (!quote) return []

    const { open = [], high = [], low = [], close = [], volume = [] } = quote

    const candles: OHLCV[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = open[i]
      const h = high[i]
      const l = low[i]
      const c = close[i]
      const v = volume[i]
      // Skip candles with null values (gaps/market closed)
      if (o == null || h == null || l == null || c == null) continue
      candles.push({
        time: timestamps[i] * 1000, // convert seconds → ms
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      })
    }

    // Sort ascending by time just in case
    candles.sort((a, b) => a.time - b.time)

    return interval === "4h" ? aggregateCandles(candles, FOUR_HOURS_MS) : candles
  } catch (e) {
    console.error("Yahoo Finance fetch error:", e)
    return []
  }
}

export const fetchYahooCandles = createServerFn()
  .validator(
    z.object({
      symbol: z.string(),
      exchange: z.string(),
      interval: z.string().default("1d"),
    }),
  )
  .handler(({ data }) => getYahooCandles(data.symbol, data.exchange, data.interval))
