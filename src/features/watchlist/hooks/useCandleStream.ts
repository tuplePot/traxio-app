import { useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { wsManager } from "@/lib/websocket"
import { fetchCandles } from "@/server/market-data"
import type { CandleResult } from "@/types/market"
import type { OHLCV } from "@/types/trading"
import type { WatchlistItem } from "@/db/schema/watchlist"
import { LIMIT } from "../constants"
import type { Interval } from "../types"

const INTRADAY = new Set<Interval>(["1m", "5m", "15m", "30m", "1h"])

/**
 * Ambil candle data untuk satu item dari sumber mana pun (server yang resolve:
 * Binance spot/futures, Bybit, OKX, Gate, CoinGecko, Yahoo). Kalau sumbernya
 * Binance spot, update realtime lewat websocket; selain itu polling berkala.
 */
export function useCandleStream(activeItem: WatchlistItem, interval: Interval) {
  const queryClient = useQueryClient()
  const isMounted = useRef(true)
  const queryKey = ["candles", activeItem.symbol, activeItem.exchange, interval]

  const candleQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchCandles({
        data: {
          symbol: activeItem.symbol,
          exchange: activeItem.exchange,
          interval,
          description: activeItem.description ?? undefined,
          limit: LIMIT,
        },
      }),
    refetchInterval: (query) => {
      const source = query.state.data?.source
      if (!source || source === "binance") return false
      return INTRADAY.has(interval) ? 15_000 : 60_000
    },
  })

  const source = candleQuery.data?.source ?? null
  const sourceSymbol = candleQuery.data?.sourceSymbol ?? null
  const isRealtime = source === "binance"

  useEffect(() => {
    if (!isRealtime || !sourceSymbol) return
    isMounted.current = true
    wsManager.connect()
    wsManager.subscribeKline(sourceSymbol, interval, (c) => {
      if (!isMounted.current) return
      queryClient.setQueryData<CandleResult>(
        ["candles", activeItem.symbol, activeItem.exchange, interval],
        (prev) => {
          if (!prev) return prev
          const updated: OHLCV[] = [...prev.candles]
          const last = updated.length - 1
          if (last >= 0 && updated[last].time === c.time) updated[last] = c
          else {
            updated.push(c)
            if (updated.length > LIMIT) updated.shift()
          }
          return { ...prev, candles: updated }
        }
      )
    })
    return () => {
      isMounted.current = false
      wsManager.disconnect()
    }
  }, [activeItem.symbol, activeItem.exchange, interval, isRealtime, sourceSymbol, queryClient])

  return {
    candleQuery,
    candles: candleQuery.data?.candles ?? [],
    source,
    sourceSymbol,
    isRealtime,
    isIDR: candleQuery.data?.currency === "IDR",
  }
}
