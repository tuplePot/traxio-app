import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import type { OHLCV } from "@/types/trading"
import { MARKET_INTERVALS } from "@/types/market"
import type { CandleResult, CandleSource, MarketInterval } from "@/types/market"
import { WEEK_MS, aggregateCandles } from "@/utils/candles"
import { YAHOO_EXCHANGES, getYahooCandles } from "./yahoo-finance"

/**
 * Resolver sumber candle untuk simbol watchlist dari exchange apa pun
 * (BINANCE spot/perp, CRYPTOCAP, CRYPTO, BYBIT, OKX, GATE, IDX, NASDAQ, ...).
 * Yahoo dipakai untuk saham; crypto dicoba berurutan di beberapa exchange
 * publik, CoinGecko jadi cadangan terakhir.
 */

const INTERVAL_MS: Record<MarketInterval, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
}

const DAY_MS = 86_400_000
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ── Exchange fetchers (semua return candle ascending, time dalam ms) ─────────

type Fetcher = (symbol: string, interval: MarketInterval, limit: number) => Promise<OHLCV[]>

function parseBinanceRows(rows: unknown): OHLCV[] {
  if (!Array.isArray(rows)) return []
  return (rows as unknown[][]).map((r) => ({
    time: r[0] as number,
    open: parseFloat(r[1] as string),
    high: parseFloat(r[2] as string),
    low: parseFloat(r[3] as string),
    close: parseFloat(r[4] as string),
    volume: parseFloat(r[5] as string),
  }))
}

const binanceSpot: Fetcher = async (symbol, interval, limit) =>
  parseBinanceRows(
    await getJson(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${Math.min(limit, 1000)}`,
    ),
  )

const binanceFutures: Fetcher = async (symbol, interval, limit) =>
  parseBinanceRows(
    await getJson(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${Math.min(limit, 1500)}`,
    ),
  )

const BYBIT_INTERVAL: Record<MarketInterval, string> = {
  "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D", "1w": "W",
}

const bybit: Fetcher = async (symbol, interval, limit) => {
  const json = await getJson<{ retCode: number; result?: { list?: string[][] } }>(
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${BYBIT_INTERVAL[interval]}&limit=${Math.min(limit, 1000)}`,
  )
  if (!json || json.retCode !== 0) return []
  return (json.result?.list ?? [])
    .map((r) => ({
      time: Number(r[0]),
      open: parseFloat(r[1]),
      high: parseFloat(r[2]),
      low: parseFloat(r[3]),
      close: parseFloat(r[4]),
      volume: parseFloat(r[5]),
    }))
    .reverse()
}

const OKX_BAR: Record<MarketInterval, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "4h": "4H", "1d": "1Dutc", "1w": "1Wutc",
}

const okx: Fetcher = async (symbol, interval, limit) => {
  const json = await getJson<{ code: string; data?: string[][] }>(
    `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=${OKX_BAR[interval]}&limit=${Math.min(limit, 300)}`,
  )
  if (!json || json.code !== "0") return []
  return (json.data ?? [])
    .map((r) => ({
      time: Number(r[0]),
      open: parseFloat(r[1]),
      high: parseFloat(r[2]),
      low: parseFloat(r[3]),
      close: parseFloat(r[4]),
      volume: parseFloat(r[5]),
    }))
    .reverse()
}

const GATE_INTERVAL: Record<MarketInterval, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "7d",
}

const gate: Fetcher = async (symbol, interval, limit) => {
  const rows = await getJson<string[][]>(
    `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol}&interval=${GATE_INTERVAL[interval]}&limit=${Math.min(limit, 1000)}`,
  )
  if (!Array.isArray(rows)) return []
  // [t(sec), quoteVolume, close, high, low, open, baseVolume, closed]
  return rows.map((r) => ({
    time: Number(r[0]) * 1000,
    open: parseFloat(r[5]),
    high: parseFloat(r[3]),
    low: parseFloat(r[4]),
    close: parseFloat(r[2]),
    volume: parseFloat(r[6]),
  }))
}

// ── CoinGecko (cadangan terakhir, tanpa API key) ─────────────────────────────

interface CoinGeckoCoin {
  id: string
  symbol: string
  name: string
}

const coinGeckoIdCache = new Map<string, CoinGeckoCoin | null>()

async function coinGeckoLookup(query: string, preferSymbol?: string): Promise<CoinGeckoCoin | null> {
  const key = `${query}|${preferSymbol ?? ""}`.toLowerCase()
  if (coinGeckoIdCache.has(key)) return coinGeckoIdCache.get(key)!
  const json = await getJson<{ coins?: CoinGeckoCoin[] }>(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
  )
  const coins = json?.coins ?? []
  const coin =
    (preferSymbol && coins.find((c) => c.symbol.toUpperCase() === preferSymbol.toUpperCase())) ||
    coins[0] ||
    null
  if (json) coinGeckoIdCache.set(key, coin)
  return coin
}

async function coinGeckoCandles(id: string, interval: MarketInterval, limit: number): Promise<OHLCV[]> {
  if (interval === "1d" || interval === "1w") {
    const days = Math.min(365, interval === "1w" ? limit * 7 : limit)
    const json = await getJson<{ prices?: [number, number][]; total_volumes?: [number, number][] }>(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    )
    const prices = json?.prices ?? []
    const volumes = json?.total_volumes ?? []
    const daily: OHLCV[] = prices.map(([t, p], i) => {
      const prev = i > 0 ? prices[i - 1][1] : p
      return {
        time: t - (t % DAY_MS),
        open: prev,
        high: Math.max(prev, p),
        low: Math.min(prev, p),
        close: p,
        volume: volumes[i]?.[1] ?? 0,
      }
    })
    return interval === "1w" ? aggregateCandles(daily, WEEK_MS) : daily
  }
  // OHLC endpoint: days=1 → 30m, days≤30 → 4h
  const days = interval === "4h" ? 30 : 1
  const rows = await getJson<number[][]>(
    `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
  )
  if (!Array.isArray(rows)) return []
  return rows.map((r) => ({ time: r[0], open: r[1], high: r[2], low: r[3], close: r[4], volume: 0 }))
}

// ── Symbol parsing ───────────────────────────────────────────────────────────

const QUOTES = ["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "USD", "IDR", "EUR", "TRY", "BRL", "BTC", "ETH", "BNB"]

interface ParsedPair {
  /** Simbol asli tanpa suffix .P */
  raw: string
  base: string
  quote: string
  perp: boolean
}

function parsePair(symbol: string, exchange: string): ParsedPair {
  let raw = symbol.toUpperCase().trim()
  const perp = raw.endsWith(".P")
  if (perp) raw = raw.slice(0, -2)
  if (exchange === "CRYPTOCAP") {
    // CRYPTOCAP:LINK = market cap LINK → pakai harga LINK/USDT (bentuk grafik sama)
    return { raw, base: raw.replace(/\.D$/, ""), quote: "USD", perp: false }
  }
  const quote = QUOTES.find((q) => raw.length > q.length && raw.endsWith(q))
  return { raw, base: quote ? raw.slice(0, -quote.length) : raw, quote: quote ?? "USD", perp }
}

// ── Resolution ───────────────────────────────────────────────────────────────

interface Candidate {
  source: CandleSource
  symbol: string
  currency: "USD" | "IDR"
  fetch: Fetcher
}

function usdCandidates(base: string): Candidate[] {
  return [
    { source: "binance", symbol: `${base}USDT`, currency: "USD", fetch: binanceSpot },
    { source: "binance-futures", symbol: `${base}USDT`, currency: "USD", fetch: binanceFutures },
    { source: "bybit", symbol: `${base}USDT`, currency: "USD", fetch: bybit },
    { source: "okx", symbol: `${base}-USDT`, currency: "USD", fetch: okx },
    { source: "gate", symbol: `${base}_USDT`, currency: "USD", fetch: gate },
  ]
}

function exactCandidates(pair: ParsedPair, exchange: string): Candidate[] {
  const currency = pair.quote === "IDR" ? "IDR" : "USD"
  const spot: Candidate = { source: "binance", symbol: pair.raw, currency, fetch: binanceSpot }
  const fut: Candidate = { source: "binance-futures", symbol: pair.raw, currency, fetch: binanceFutures }
  switch (exchange) {
    case "BINANCE":
      return pair.perp ? [fut, spot] : [spot, fut]
    case "BYBIT":
      return [{ source: "bybit", symbol: pair.raw, currency, fetch: bybit }]
    case "OKX":
      return [{ source: "okx", symbol: `${pair.base}-${pair.quote}`, currency, fetch: okx }]
    case "GATEIO":
    case "GATE":
      return [{ source: "gate", symbol: `${pair.base}_${pair.quote}`, currency, fetch: gate }]
    default:
      return []
  }
}

/** Data dianggap valid kalau ada, masih baru, dan tidak flat tanpa volume (pair delisted). */
function isUsable(candles: OHLCV[], interval: MarketInterval, checkVolume: boolean): boolean {
  if (candles.length < 2) return false
  const last = candles[candles.length - 1]
  const maxAge = Math.max(INTERVAL_MS[interval] * 3, 3 * DAY_MS)
  if (Date.now() - last.time > maxAge) return false
  if (checkVolume) {
    const tail = candles.slice(-5)
    if (tail.every((c) => c.volume === 0)) return false
  }
  return true
}

const resolvedCache = new Map<string, Candidate>()

async function tryCandidates(
  candidates: Candidate[],
  interval: MarketInterval,
  limit: number,
): Promise<{ candidate: Candidate; candles: OHLCV[] } | null> {
  // Pair yang baru listing (mis. HYPEUSDT di Binance) histori-nya pendek → kurang
  // untuk MA/RSI. Ambil yang pertama dengan histori cukup, kalau tidak ada pakai yang terpanjang.
  const enough = Math.min(limit, 120)
  let best: { candidate: Candidate; candles: OHLCV[] } | null = null
  for (const candidate of candidates) {
    const candles = await candidate.fetch(candidate.symbol, interval, limit)
    if (!isUsable(candles, interval, true)) continue
    if (candles.length >= enough) return { candidate, candles }
    if (!best || candles.length > best.candles.length) best = { candidate, candles }
  }
  return best
}

function dedupe(list: Candidate[]): Candidate[] {
  const seen = new Set<string>()
  return list.filter((c) => {
    const k = `${c.source}:${c.symbol}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function getCryptoCandles(
  symbol: string,
  exchange: string,
  interval: MarketInterval,
  limit: number,
  description?: string,
): Promise<CandleResult> {
  const cacheKey = `${exchange}:${symbol}:${interval}`
  const cached = resolvedCache.get(cacheKey)
  if (cached) {
    const candles = await cached.fetch(cached.symbol, interval, limit)
    if (candles.length > 0) {
      return { candles, source: cached.source, sourceSymbol: cached.symbol, currency: cached.currency }
    }
    resolvedCache.delete(cacheKey)
  }

  const pair = parsePair(symbol, exchange)
  const found = await tryCandidates(
    dedupe([...exactCandidates(pair, exchange), ...usdCandidates(pair.base)]),
    interval,
    limit,
  )
  if (found) {
    resolvedCache.set(cacheKey, found.candidate)
    return {
      candles: found.candles,
      source: found.candidate.source,
      sourceSymbol: found.candidate.symbol,
      currency: found.candidate.currency,
    }
  }

  // Ticker TradingView kadang beda dari ticker exchange (mis. CRYPTO:HYPEHUSD = HYPE).
  // Cari koin lewat CoinGecko (pakai nama dari watchlist), lalu coba exchange lagi.
  let finalCoin = await coinGeckoLookup(pair.base, pair.base)
  if (finalCoin?.symbol.toUpperCase() !== pair.base && description) {
    finalCoin = (await coinGeckoLookup(description.split(/[/,]/)[0].trim())) ?? finalCoin
  }
  if (!finalCoin) return { candles: [], source: null, sourceSymbol: null, currency: "USD" }

  const altBase = finalCoin.symbol.toUpperCase()
  if (altBase !== pair.base) {
    const alt = await tryCandidates(usdCandidates(altBase), interval, limit)
    if (alt) {
      resolvedCache.set(cacheKey, alt.candidate)
      return {
        candles: alt.candles,
        source: alt.candidate.source,
        sourceSymbol: alt.candidate.symbol,
        currency: "USD",
      }
    }
  }

  const geckoFetch: Fetcher = coinGeckoCandles
  const candles = await geckoFetch(finalCoin.id, interval, limit)
  if (!isUsable(candles, interval, false)) {
    return { candles: [], source: null, sourceSymbol: null, currency: "USD" }
  }
  resolvedCache.set(cacheKey, { source: "coingecko", symbol: finalCoin.id, currency: "USD", fetch: geckoFetch })
  return { candles, source: "coingecko", sourceSymbol: finalCoin.id, currency: "USD" }
}

/** Ambil candle untuk simbol watchlist dari exchange apa pun. Dipakai chart & analisis. */
export async function getCandles(
  symbol: string,
  exchange: string,
  interval: MarketInterval,
  opts: { limit?: number; description?: string } = {},
): Promise<CandleResult> {
  const limit = opts.limit ?? 500
  const ex = exchange.toUpperCase()
  if (YAHOO_EXCHANGES.has(ex)) {
    const candles = (await getYahooCandles(symbol, ex, interval)).slice(-limit)
    return {
      candles,
      source: candles.length > 0 ? "yahoo" : null,
      sourceSymbol: symbol,
      currency: ex === "IDX" ? "IDR" : "USD",
    }
  }
  return getCryptoCandles(symbol, ex, interval, limit, opts.description)
}

export const fetchCandles = createServerFn()
  .validator(
    z.object({
      symbol: z.string().min(1),
      exchange: z.string().min(1),
      interval: z.enum(MARKET_INTERVALS),
      description: z.string().optional(),
      limit: z.number().int().min(10).max(1000).optional(),
    }),
  )
  .handler(({ data }) =>
    getCandles(data.symbol, data.exchange, data.interval, {
      limit: data.limit,
      description: data.description,
    }),
  )
