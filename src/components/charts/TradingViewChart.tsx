import { useEffect, useRef } from "react"
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts"
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from "lightweight-charts"
import type { OHLCV } from "@/types/trading"
import { useTheme } from "@/lib/theme-context"
import type { ResolvedMode } from "@/lib/theme-context"

interface TradingViewChartProps {
  data: OHLCV[]
}

const CHART_COLORS: Record<
  ResolvedMode,
  { text: string; grid: string; border: string }
> = {
  dark: {
    text: "#888888",
    grid: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
  },
  light: {
    text: "#64748b",
    grid: "rgba(15,23,42,0.06)",
    border: "rgba(15,23,42,0.12)",
  },
}

function themeOptions(mode: ResolvedMode) {
  const c = CHART_COLORS[mode]
  return {
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: c.text,
    },
    grid: {
      vertLines: { color: c.grid },
      horzLines: { color: c.grid },
    },
    timeScale: { borderColor: c.border },
    rightPriceScale: { borderColor: c.border },
  }
}

export function TradingViewChart({ data }: TradingViewChartProps) {
  const { resolvedMode } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const hasFitContent = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const theme = themeOptions(resolvedMode)
    const chart = createChart(containerRef.current, {
      ...theme,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 400,
      timeScale: {
        ...theme.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
    })

    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 400,
        })
      }
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
    // Mode changes are applied in place below; recreating would lose zoom.
  }, [])

  useEffect(() => {
    chartRef.current?.applyOptions(themeOptions(resolvedMode))
  }, [resolvedMode])

  useEffect(() => {
    if (data.length === 0) {
      hasFitContent.current = false
      return
    }
    if (!seriesRef.current) return

    // Shift timestamps to local timezone so the chart shows local time, not UTC.
    // getTimezoneOffset() returns minutes BEHIND UTC (negative for UTC+ zones),
    // so negate it and convert to seconds to get the local offset ahead of UTC.
    const localOffsetSec = -new Date().getTimezoneOffset() * 60

    const chartData: CandlestickData[] = data.map((d) => ({
      time: (d.time / 1000 + localOffsetSec) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
    seriesRef.current.setData(chartData)

    if (!hasFitContent.current) {
      chartRef.current?.timeScale().fitContent()
      hasFitContent.current = true
    }
  }, [data])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[300px] w-full sm:min-h-[400px]"
    />
  )
}
