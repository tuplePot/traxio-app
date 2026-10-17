import { useEffect, useRef, useState } from "react"
import { wsManager } from "@/lib/websocket"
import { generateMarketScore } from "@/features/market-analysis/scoring"
import { calculateProbabilities } from "@/features/probability-engine"
import { TradingViewChart } from "@/components/charts/TradingViewChart"
import { ScorePanel } from "@/features/market-analysis/components/ScorePanel"
import { ProbabilityPanel } from "@/features/probability-engine/components/ProbabilityPanel"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Clock } from "lucide-react"
import type { OHLCV, MarketScore, ProbabilityResult } from "@/types/trading"

const SYMBOL = "BTCUSDT"
const INTERVAL = "1m"
const LIMIT = 500

export function DashboardClient() {
  const [candles, setCandles] = useState<OHLCV[]>([])
  const [score, setScore] = useState<MarketScore | null>(null)
  const [probability, setProbability] = useState<ProbabilityResult | null>(null)
  const isMounted = useRef(true)

  // Fetch historical + connect WebSocket
  useEffect(() => {
    isMounted.current = true

    fetch(
      `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${LIMIT}`,
    )
      .then((r) => r.json())
      .then((rows: unknown[][]) => {
        if (!isMounted.current) return
        const historical: OHLCV[] = rows.map((r) => ({
          time: r[0] as number,
          open: parseFloat(r[1] as string),
          high: parseFloat(r[2] as string),
          low: parseFloat(r[3] as string),
          close: parseFloat(r[4] as string),
          volume: parseFloat(r[5] as string),
        }))
        setCandles(historical)
      })
      .catch(console.error)

    wsManager.connect()
    wsManager.subscribeKline(SYMBOL, INTERVAL, (newCandle) => {
      if (!isMounted.current) return
      setCandles((prev) => {
        const updated = [...prev]
        const last = updated.length - 1
        if (last >= 0 && updated[last].time === newCandle.time) {
          updated[last] = newCandle
        } else {
          updated.push(newCandle)
          if (updated.length > LIMIT) updated.shift()
        }
        return updated
      })
    })

    return () => {
      isMounted.current = false
      wsManager.disconnect()
    }
  }, [])

  // Recalculate score & probability on each candle update
  useEffect(() => {
    if (candles.length === 0) return
    const newScore = generateMarketScore(candles)
    setScore(newScore)
    setProbability(calculateProbabilities(candles, newScore))
  }, [candles])

  const lastCandle = candles[candles.length - 1]
  const lastPrice = lastCandle ? lastCandle.close.toFixed(2) : "—"

  return (
    <div className="grid h-full grid-cols-12 gap-4">
      {/* Chart */}
      <div className="col-span-12 flex flex-col lg:col-span-9">
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b py-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs tracking-widest">
                {SYMBOL} · {INTERVAL.toUpperCase()}
              </span>
              <span className="text-foreground font-mono text-sm font-semibold">${lastPrice}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="text-muted-foreground size-3" />
              <span className="text-muted-foreground text-[10px] tracking-widest">REALTIME</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            <TradingViewChart data={candles} />
          </CardContent>
        </Card>
      </div>

      {/* Side panels */}
      <div className="col-span-12 flex flex-col gap-4 lg:col-span-3">
        <div className="flex-1">
          <ScorePanel score={score} />
        </div>

        <Card className="flex-1">
          <CardHeader className="border-b py-3">
            <span className="text-muted-foreground text-xs tracking-widest">PROBABILITY ENGINE</span>
          </CardHeader>
          <CardContent className="py-4">
            <ProbabilityPanel probability={probability} />
          </CardContent>
        </Card>
      </div>

      {/* Status bar */}
      <div className="col-span-12">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <span className="text-muted-foreground text-[10px] tracking-widest whitespace-nowrap">STATUS</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {candles.length > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Connected
                  </span>
                  <span className="text-muted-foreground/45">·</span>
                  <span>{candles.length} candles loaded</span>
                  <span className="text-muted-foreground/45">·</span>
                  <span>Score: {score?.bullishScore ?? 0}% Bull / {score?.bearishScore ?? 0}% Bear</span>
                  <span className="text-muted-foreground/45">·</span>
                  <span>{score?.dominance ?? "..."}</span>
                </>
              ) : (
                <span className="text-muted-foreground animate-pulse">Connecting to Binance...</span>
              )}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
