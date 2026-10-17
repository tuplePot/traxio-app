import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getCandles } from "./market-data"
import type { CandleSource } from "@/types/market"

// ── Config ────────────────────────────────────────────────────────────────────

export const analysisConfigSchema = z.object({
  dataDays: z.number().int().min(14).max(365).default(90),
  rsiPeriod: z.number().int().min(5).max(30).default(14),
  maShort: z.number().int().default(20),
  maLong: z.number().int().default(50),
  interval: z.enum(["1d", "1w"]).default("1d"),
})

export type AnalysisConfig = z.infer<typeof analysisConfigSchema>

export const DEFAULT_CONFIG: AnalysisConfig = {
  dataDays: 90,
  rsiPeriod: 14,
  maShort: 20,
  maLong: 50,
  interval: "1d",
}

// ── Indicator calculations ────────────────────────────────────────────────────

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50
  const changes = closes.slice(1).map((c, i) => c - closes[i])
  let avgGain = changes.slice(0, period).reduce((s, c) => s + Math.max(c, 0), 0) / period
  let avgLoss = changes.slice(0, period).reduce((s, c) => s + Math.max(-c, 0), 0) / period
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(changes[i], 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-changes[i], 0)) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] ?? 0
  return data.slice(-period).reduce((a, b) => a + b, 0) / period
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  return data.reduce<number[]>((acc, val, i) => {
    acc.push(i === 0 ? val : val * k + acc[i - 1] * (1 - k))
    return acc
  }, [])
}

function calculateMACD(closes: number[]): { macd: number; signal: number } {
  if (closes.length < 35) return { macd: 0, signal: 0 }
  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  const macdLine = ema12.map((v, i) => v - ema26[i])
  const signalLine = ema(macdLine.slice(-9), 9)
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
  }
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface AnalysisResult {
  symbol: string
  exchange: string
  name: string
  price: number
  change24h: number
  rsi: number
  smaShort: number
  smaLong: number
  maShortLabel: number
  maLongLabel: number
  macd: number
  macdSignal: number
  momentum5d: number
  score: number
  signal: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL"
  reasons: string[]
  config: { dataDays: number; rsiPeriod: number; maShort: number; maLong: number; interval: string }
  /** Mata uang harga (IDR untuk saham IDX & pair *IDR). */
  currency: "USD" | "IDR"
  source: CandleSource | null
}

// ── Scorer ────────────────────────────────────────────────────────────────────

function scoreCandles(
  closes: number[],
  symbol: string,
  exchange: string,
  name: string,
  change24h: number,
  cfg: AnalysisConfig,
): AnalysisResult {
  const price = closes[closes.length - 1]
  const rsi = calculateRSI(closes, cfg.rsiPeriod)
  const smaShortVal = sma(closes, cfg.maShort)
  const smaLongVal = sma(closes, cfg.maLong)
  const { macd, signal: macdSig } = calculateMACD(closes)
  const price5dAgo = closes[Math.max(0, closes.length - 6)]
  const momentum5d = price5dAgo > 0 ? ((price - price5dAgo) / price5dAgo) * 100 : 0

  let score = 50
  const reasons: string[] = []

  // RSI (period from config)
  const rsiLabel = `RSI(${cfg.rsiPeriod}) ${rsi.toFixed(0)}`
  if (rsi < 25) { score += 22; reasons.push(`${rsiLabel} — sangat oversold, peluang rebound besar 🟢`) }
  else if (rsi < 35) { score += 14; reasons.push(`${rsiLabel} — oversold, area menarik 🟢`) }
  else if (rsi < 45) { score += 5; reasons.push(`${rsiLabel} — mendekati area beli`) }
  else if (rsi > 75) { score -= 22; reasons.push(`${rsiLabel} — sangat overbought, risiko koreksi 🔴`) }
  else if (rsi > 65) { score -= 12; reasons.push(`${rsiLabel} — overbought, hati-hati 🟡`) }
  else { reasons.push(`${rsiLabel} — netral`) }

  // MA trend (short/long from config)
  const maLabel = `SMA${cfg.maShort}/${cfg.maLong}`
  if (price > smaShortVal && smaShortVal > smaLongVal) {
    score += 18; reasons.push(`${maLabel}: harga di atas kedua MA — uptrend kuat 🟢`)
  } else if (price > smaShortVal) {
    score += 7; reasons.push(`${maLabel}: harga di atas SMA${cfg.maShort}, tren jangka pendek positif 🟡`)
  } else if (price < smaShortVal && smaShortVal < smaLongVal) {
    score -= 18; reasons.push(`${maLabel}: harga di bawah kedua MA — tren turun 🔴`)
  } else {
    score -= 7; reasons.push(`${maLabel}: harga di bawah SMA${cfg.maShort} 🟡`)
  }

  // MACD
  if (macd > macdSig && macd > 0) {
    score += 14; reasons.push("MACD bullish crossover di zona positif — momentum naik 🟢")
  } else if (macd > macdSig) {
    score += 7; reasons.push("MACD bullish crossover — sinyal beli mulai muncul 🟡")
  } else if (macd < macdSig && macd < 0) {
    score -= 14; reasons.push("MACD bearish di zona negatif — momentum turun 🔴")
  } else {
    score -= 7; reasons.push("MACD bearish crossover 🟡")
  }

  // 5-period momentum
  const mLabel = cfg.interval === "1w" ? "5 minggu" : "5 hari"
  if (momentum5d > 8) { score += 6; reasons.push(`Momentum ${mLabel}: +${momentum5d.toFixed(1)}% kuat 🟢`) }
  else if (momentum5d > 2) { score += 3; reasons.push(`Momentum ${mLabel}: +${momentum5d.toFixed(1)}% positif`) }
  else if (momentum5d < -8) { score -= 6; reasons.push(`Momentum ${mLabel}: ${momentum5d.toFixed(1)}% melemah 🔴`) }
  else if (momentum5d < -2) { score -= 3; reasons.push(`Momentum ${mLabel}: ${momentum5d.toFixed(1)}% sedikit negatif`) }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const signal: AnalysisResult["signal"] =
    score >= 74 ? "STRONG BUY" :
    score >= 60 ? "BUY" :
    score >= 42 ? "HOLD" :
    score >= 28 ? "SELL" : "STRONG SELL"

  return {
    symbol, exchange, name, price, change24h,
    rsi, smaShort: smaShortVal, smaLong: smaLongVal,
    maShortLabel: cfg.maShort, maLongLabel: cfg.maLong,
    macd, macdSignal: macdSig, momentum5d,
    score, signal, reasons: reasons.slice(0, 4),
    config: { dataDays: cfg.dataDays, rsiPeriod: cfg.rsiPeriod, maShort: cfg.maShort, maLong: cfg.maLong, interval: cfg.interval },
    currency: exchange === "IDX" ? "IDR" : "USD",
    source: null,
  }
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

interface SeriesData {
  closes: number[]
  change24h: number
  currency: "USD" | "IDR"
  source: CandleSource | null
}

/** Jumlah candle: periode yang dipilih + warmup supaya MA panjang & MACD tetap terhitung. */
function candleLimit(cfg: AnalysisConfig): number {
  const periodCandles = cfg.interval === "1w" ? Math.ceil(cfg.dataDays / 7) : cfg.dataDays
  return Math.min(Math.max(periodCandles, cfg.maLong + 40), 1000)
}

async function fetchSeries(
  symbol: string,
  exchange: string,
  cfg: AnalysisConfig,
  description?: string,
): Promise<SeriesData> {
  const res = await getCandles(symbol, exchange, cfg.interval, {
    limit: candleLimit(cfg),
    description,
  })
  const closes = res.candles.map((c) => c.close)

  // Perubahan 24 jam = close terakhir vs close candle harian sebelumnya
  let dailyCloses = closes
  if (cfg.interval === "1w" && res.candles.length > 0) {
    const daily = await getCandles(symbol, exchange, "1d", { limit: 2, description })
    dailyCloses = daily.candles.map((c) => c.close)
  }
  const n = dailyCloses.length
  const change24h =
    n >= 2 && dailyCloses[n - 2] > 0
      ? ((dailyCloses[n - 1] - dailyCloses[n - 2]) / dailyCloses[n - 2]) * 100
      : 0

  return { closes, change24h, currency: res.currency, source: res.source }
}

// ── Curated lists ─────────────────────────────────────────────────────────────

const TOP_CRYPTO = [
  { symbol: "BTCUSDT", name: "Bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum" },
  { symbol: "BNBUSDT", name: "BNB" },
  { symbol: "SOLUSDT", name: "Solana" },
  { symbol: "XRPUSDT", name: "XRP" },
  { symbol: "AVAXUSDT", name: "Avalanche" },
  { symbol: "LINKUSDT", name: "Chainlink" },
  { symbol: "DOTUSDT", name: "Polkadot" },
  { symbol: "INJUSDT", name: "Injective" },
  { symbol: "NEARUSDT", name: "NEAR Protocol" },
]

const ALTCOINS = [
  { symbol: "DOGEUSDT", name: "Dogecoin" },
  { symbol: "ADAUSDT", name: "Cardano" },
  { symbol: "TRXUSDT", name: "TRON" },
  { symbol: "XLMUSDT", name: "Stellar" },
  { symbol: "MATICUSDT", name: "Polygon" },
  { symbol: "VETUSDT", name: "VeChain" },
  { symbol: "SHIBUSDT", name: "Shiba Inu" },
  { symbol: "SANDUSDT", name: "The Sandbox" },
  { symbol: "GALAUSDT", name: "Gala" },
  { symbol: "FTMUSDT", name: "Fantom" },
]

const IDX_STOCKS = [
  { symbol: "BBCA", name: "Bank Central Asia" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia" },
  { symbol: "BMRI", name: "Bank Mandiri" },
  { symbol: "TLKM", name: "Telkom Indonesia" },
  { symbol: "ASII", name: "Astra International" },
  { symbol: "ADRO", name: "Adaro Energy" },
  { symbol: "PTBA", name: "Bukit Asam" },
  { symbol: "INDF", name: "Indofood" },
  { symbol: "ANTM", name: "Aneka Tambang" },
  { symbol: "ICBP", name: "Indofood CBP" },
  { symbol: "BREN", name: "Barito Renewables" },
  { symbol: "MYOR", name: "Mayora Indah" },
]

// ── Server functions ──────────────────────────────────────────────────────────

const configValidator = z.object({ config: analysisConfigSchema })

/** Minimal candle agar RSI & MACD bermakna. MA panjang pakai data seadanya. */
function minCandles(cfg: AnalysisConfig): number {
  return Math.max(cfg.rsiPeriod + 5, 35)
}

export interface UnavailableSymbol {
  symbol: string
  exchange: string
  name: string
  reason: string
}

type AnalyzeOutcome =
  | { ok: true; result: AnalysisResult }
  | { ok: false; unavailable: UnavailableSymbol }

async function analyzeOne(
  symbol: string,
  exchange: string,
  name: string,
  cfg: AnalysisConfig,
  displaySymbol = symbol,
): Promise<AnalyzeOutcome> {
  try {
    const series = await fetchSeries(symbol, exchange, cfg, name)
    if (series.closes.length === 0) {
      return {
        ok: false,
        unavailable: { symbol: displaySymbol, exchange, name, reason: "Sumber data tidak ditemukan" },
      }
    }
    if (series.closes.length < minCandles(cfg)) {
      return {
        ok: false,
        unavailable: {
          symbol: displaySymbol,
          exchange,
          name,
          reason: `Histori baru ${series.closes.length} candle (butuh ≥ ${minCandles(cfg)})`,
        },
      }
    }
    const result = scoreCandles(series.closes, displaySymbol, exchange, name, series.change24h, cfg)
    if (series.closes.length < cfg.maLong) {
      result.reasons.push(`Histori ${series.closes.length} candle < MA${cfg.maLong} — MA panjang kurang akurat`)
    }
    return { ok: true, result: { ...result, currency: series.currency, source: series.source } }
  } catch {
    return {
      ok: false,
      unavailable: { symbol: displaySymbol, exchange, name, reason: "Gagal mengambil data" },
    }
  }
}

function sortByScore(outcomes: AnalyzeOutcome[]): AnalysisResult[] {
  return outcomes
    .flatMap((o) => (o.ok ? [o.result] : []))
    .sort((a, b) => b.score - a.score)
}

async function analyzeCryptoList(
  list: Array<{ symbol: string; name: string }>,
  cfg: AnalysisConfig,
): Promise<AnalysisResult[]> {
  const outcomes = await Promise.all(
    list.map(({ symbol, name }) =>
      analyzeOne(symbol, "BINANCE", name, cfg, symbol.replace("USDT", "")),
    ),
  )
  return sortByScore(outcomes)
}

async function analyzeIDXList(cfg: AnalysisConfig): Promise<AnalysisResult[]> {
  const outcomes = await Promise.all(
    IDX_STOCKS.map(({ symbol, name }) => analyzeOne(symbol, "IDX", name, cfg)),
  )
  return sortByScore(outcomes)
}

export interface RecommendationsData {
  topCrypto: AnalysisResult[]
  altcoins: AnalysisResult[]
  idxStocks: AnalysisResult[]
  fetchedAt: string
  config: AnalysisConfig
}

export const getRecommendations = createServerFn()
  .validator(configValidator)
  .handler(async ({ data }): Promise<RecommendationsData> => {
    const cfg = data.config
    const [topCrypto, altcoins, idxStocks] = await Promise.all([
      analyzeCryptoList(TOP_CRYPTO, cfg),
      analyzeCryptoList(ALTCOINS, cfg),
      analyzeIDXList(cfg),
    ])
    return { topCrypto, altcoins, idxStocks, fetchedAt: new Date().toISOString(), config: cfg }
  })

export interface CustomAnalysisData {
  results: AnalysisResult[]
  /** Simbol yang tidak bisa dianalisis — ditampilkan, bukan dibuang diam-diam. */
  unavailable: UnavailableSymbol[]
}

// Analyze a custom list of symbols (e.g. from watchlist)
export const analyzeCustomSymbols = createServerFn()
  .validator(
    z.object({
      symbols: z.array(z.object({
        symbol: z.string(),
        exchange: z.string(),
        name: z.string().optional(),
      })).max(200),
      config: analysisConfigSchema,
    }),
  )
  .handler(async ({ data }): Promise<CustomAnalysisData> => {
    const outcomes = await Promise.all(
      data.symbols.map(({ symbol, exchange, name = symbol }) =>
        analyzeOne(symbol, exchange, name, data.config),
      ),
    )
    return {
      results: sortByScore(outcomes),
      unavailable: outcomes.flatMap((o) => (o.ok ? [] : [o.unavailable])),
    }
  })

export const analyzeSymbol = createServerFn()
  .validator(z.object({
    symbol: z.string(),
    exchange: z.string(),
    name: z.string().optional(),
  }))
  .handler(async ({ data }): Promise<AnalysisResult | null> => {
    const { symbol, exchange, name = symbol } = data
    const outcome = await analyzeOne(symbol, exchange, name, DEFAULT_CONFIG)
    return outcome.ok ? outcome.result : null
  })
