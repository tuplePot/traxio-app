import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { parseGoogleNewsXml } from "@/features/news/utils"
import { resolveCmcSlug } from "@/features/news/constants"
import { SYMBOL_NAMES } from "@/features/watchlist/constants"
import type { CmcTldrItem, NewsItem } from "@/features/news/interface"

export const fetchNews = createServerFn()
  .validator(z.object({ symbol: z.string() }))
  .handler(async ({ data }): Promise<NewsItem[]> => {
    const symbolClean = data.symbol.replace("USDT", "").replace("USD", "")
    const symbolName = SYMBOL_NAMES[symbolClean] || symbolClean
    const query = `${symbolClean} OR "${symbolName}"`

    const url = new URL("https://news.google.com/rss/search")
    url.searchParams.set("q", query)
    url.searchParams.set("hl", "en-US")
    url.searchParams.set("gl", "US")
    url.searchParams.set("ceid", "US:en")

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      })

      if (!res.ok) return []

      const xml = await res.text()
      const parsedItems = parseGoogleNewsXml(xml)

      parsedItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

      return parsedItems.slice(0, 15)
    } catch (e) {
      console.error("Error fetching news:", e)
      return []
    }
  })

export const fetchCmcNews = createServerFn()
  .validator(z.object({ symbol: z.string() }))
  .handler(async ({ data }): Promise<CmcTldrItem[]> => {
    const symbolClean = data.symbol.replace("USDT", "").replace("USD", "")
    const slug = resolveCmcSlug(symbolClean)
    if (!slug) return []

    try {
      const res = await fetch(
        "https://api.coinmarketcap.com/content/v3/news-tldr/list",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, languageCode: "en" }),
        }
      )

      if (!res.ok) return []

      const json = await res.json()
      const tldrs: { id: string; content: string; time: string }[] =
        json?.data?.tldrs ?? []

      return tldrs.map((t) => ({
        id: t.id,
        content: t.content,
        time: t.time,
      }))
    } catch (e) {
      console.error("Error fetching CoinMarketCap news:", e)
      return []
    }
  })
