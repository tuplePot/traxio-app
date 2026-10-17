import { MARKET_INTERVALS } from "@/types/market"
import type { CandleSource } from "@/types/market"

export const SYMBOL_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  MATIC: "Polygon",
  LINK: "Chainlink",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  LTC: "Litecoin",
  NEAR: "NEAR Protocol",
  APT: "Aptos",
  OP: "Optimism",
  ARB: "Arbitrum",
  SUI: "Sui",
  AAPL: "Apple",
  TSLA: "Tesla",
  MSFT: "Microsoft",
  GOOGL: "Google",
  AMZN: "Amazon",
  NVDA: "NVIDIA",
  META: "Meta",
}

export const INTERVALS = MARKET_INTERVALS

export const INTERVAL_LABELS: Record<(typeof MARKET_INTERVALS)[number], string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
  "1w": "1W",
}

export const LIMIT = 500

/** Label sumber data yang tampil di header chart. */
export const SOURCE_LABELS: Record<CandleSource, string> = {
  binance: "Binance",
  "binance-futures": "Binance Futures",
  bybit: "Bybit",
  okx: "OKX",
  gate: "Gate.io",
  coingecko: "CoinGecko",
  yahoo: "Yahoo Finance",
}

export const TYPE_LABELS: Record<string, string> = {
  crypto: "Crypto",
  stock: "Stock",
  futures: "Futures",
  forex: "Forex",
  index: "Index",
  fund: "Fund",
  dr: "DR",
  bond: "Bond",
}
