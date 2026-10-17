import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

export interface TVSymbol {
  symbol: string
  fullName: string
  description: string
  exchange: string
  type: string
  currencyCode?: string
}

interface TVRawSymbol {
  symbol: string
  description: string
  type: string
  exchange?: string
  source_id?: string
  currency_code?: string
  typespecs?: string[]
}

interface TVResponse {
  symbols_remaining: number
  symbols: TVRawSymbol[]
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "")
}

export const searchSymbols = createServerFn()
  .validator(z.object({ query: z.string().min(1).max(50) }))
  .handler(async ({ data }): Promise<TVSymbol[]> => {
    const url = new URL("https://symbol-search.tradingview.com/symbol_search/v3/")
    url.searchParams.set("text", data.query)
    url.searchParams.set("hl", "1")
    url.searchParams.set("exchange", "")
    url.searchParams.set("lang", "en")
    url.searchParams.set("search_type", "undefined")
    url.searchParams.set("domain", "production")

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.tradingview.com/",
        "Origin": "https://www.tradingview.com",
      },
    })

    if (!res.ok) return []

    const json = (await res.json()) as TVResponse
    const raw = json.symbols ?? []

    return raw.slice(0, 25).map((item) => {
      const exchange = item.source_id ?? item.exchange ?? ""
      return {
        symbol: stripHtml(item.symbol),
        fullName: `${exchange}:${stripHtml(item.symbol)}`,
        description: stripHtml(item.description),
        exchange,
        type: item.type,
        currencyCode: item.currency_code,
      }
    })
  })
