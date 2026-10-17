import { SYMBOL_NAMES } from "@/features/watchlist/constants"

export type NewsSourceId = "google" | "coinmarketcap"

export const NEWS_SOURCES: { value: NewsSourceId; label: string }[] = [
  { value: "google", label: "Google News" },
  { value: "coinmarketcap", label: "CoinMarketCap" },
]

/**
 * Slug CoinMarketCap per ticker. Best-effort — CMC kadang ganti slug saat
 * rebrand token (mis. MATIC -> POL), cek lagi kalau hasil TLDR kosong terus.
 */
export const CMC_SLUGS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "bnb",
  SOL: "solana",
  XRP: "xrp",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche",
  DOT: "polkadot",
  MATIC: "polygon-ecosystem-token",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near-protocol",
  APT: "aptos",
  OP: "optimism",
  ARB: "arbitrum",
  SUI: "sui",
}

/** Resolve slug CMC dari ticker bersih (tanpa USDT/USD). Null kalau gak ketemu sama sekali. */
export function resolveCmcSlug(symbolClean: string): string | null {
  const slug = CMC_SLUGS[symbolClean]
  if (slug) return slug

  const name = SYMBOL_NAMES[symbolClean]
  if (name) return name.toLowerCase().replace(/\s+/g, "-")

  return null
}
