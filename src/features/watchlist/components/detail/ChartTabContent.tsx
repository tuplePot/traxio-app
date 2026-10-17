import { TradingViewChart } from "@/components/charts/TradingViewChart"
import { Button } from "@/components/ui/button"
import type { WatchlistItem } from "@/db/schema/watchlist"
import { Loader2, RefreshCw } from "lucide-react"
import type { UseQueryResult } from "@tanstack/react-query"
import type { CandleResult } from "@/types/market"
import type { Interval } from "../../types"

interface ChartTabContentProps {
  activeItem: WatchlistItem
  interval: Interval
  candleQuery: UseQueryResult<CandleResult>
}

export function ChartTabContent({
  activeItem,
  interval,
  candleQuery,
}: ChartTabContentProps) {
  const candles = candleQuery.data?.candles ?? []

  return (
    <div className="h-full p-2">
      {candleQuery.isLoading ? (
        <div className="flex h-full min-h-100 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs tracking-widest">
              Loading {activeItem.symbol}...
            </span>
          </div>
        </div>
      ) : candles.length === 0 ? (
        <div className="flex h-full min-h-100 flex-col items-center justify-center gap-3">
          <p className="text-xs text-muted-foreground">
            {candleQuery.data?.source === null
              ? `Sumber data untuk ${activeItem.exchange}:${activeItem.symbol} tidak ditemukan`
              : `Tidak ada data untuk ${activeItem.symbol} · ${interval}`}
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => candleQuery.refetch()}
          >
            <RefreshCw className="size-3" />
            Coba lagi
          </Button>
        </div>
      ) : (
        // key per interval → chart di-fit ulang saat timeframe berubah
        <TradingViewChart key={interval} data={candles} />
      )}
    </div>
  )
}
