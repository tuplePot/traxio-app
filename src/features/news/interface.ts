export interface NewsItem {
  id: string
  title: string
  source: { title: string; domain: string }
  publishedAt: string
  url: string
  sentiment?: "positive" | "negative" | "neutral"
}

/** Satu entri TLDR dari endpoint CoinMarketCap (content/v3/news-tldr/list). */
export interface CmcTldrItem {
  id: string
  /** Markdown mentah: bullet "🔹"/"📉" + link inline `[label](url)`. */
  content: string
  time: string
}

export function isCmcTldrItem(
  item: NewsItem | CmcTldrItem
): item is CmcTldrItem {
  return "content" in item
}