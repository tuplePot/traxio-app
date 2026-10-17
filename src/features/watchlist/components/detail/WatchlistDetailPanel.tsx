import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WatchlistItem } from "@/db/schema/watchlist"
import { useSettings } from "@/lib/settings-context"
import { formatCandlePrice } from "@/utils/currency"
import { Activity, BarChart2, Clock, Newspaper, RefreshCw } from "lucide-react"
import type { NewsSourceId } from "@/features/news/constants"
import NewsSourceChoose from "@/features/news/NewsSource.ComboBox"
import { SOURCE_LABELS } from "../../constants"
import { useCandleStream } from "../../hooks/useCandleStream"
import type { ActiveTab, Interval } from "../../types"
import { TypeBadge } from "../TypeBadge"
import { Content } from "./Content"
import { IntervalSelector } from "./IntervalSelector"

interface WatchlistDetailPanelProps {
  activeItem: WatchlistItem
}

const STOCK_TYPES = new Set(["stock", "fund", "dr", "bond"])

function defaultInterval(item: WatchlistItem): Interval {
  return item.symbolType && STOCK_TYPES.has(item.symbolType) ? "1d" : "1h"
}

export function WatchlistDetailPanel({
  activeItem,
}: WatchlistDetailPanelProps) {
  const { settings } = useSettings()
  const [interval, setInterval] = useState<Interval>(() =>
    defaultInterval(activeItem)
  )
  const [activeTab, setActiveTab] = useState<ActiveTab>("chart")
  const [newsSource, setNewsSource] = useState<NewsSourceId>("google")

  const { candleQuery, candles, source, sourceSymbol, isRealtime, isIDR } =
    useCandleStream(activeItem, interval)

  useEffect(() => {
    setInterval(defaultInterval(activeItem))
    setActiveTab("chart")
  }, [activeItem.id])

  const lastCandle = candles.at(-1)
  const showsProxy =
    source !== null &&
    sourceSymbol !== null &&
    source !== "yahoo" &&
    sourceSymbol !== activeItem.symbol

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActiveTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono text-sm font-semibold">
                {activeItem.symbol}
              </span>
              {activeItem.symbolType && (
                <TypeBadge type={activeItem.symbolType} />
              )}
            </div>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="shrink-0 text-xs tracking-widest text-muted-foreground">
              {activeItem.exchange}
            </span>
            {lastCandle && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="shrink-0 font-mono text-sm font-semibold">
                  {formatCandlePrice(
                    lastCandle.close,
                    isIDR,
                    settings.currency,
                    settings.usdToIdr
                  )}
                </span>
              </>
            )}
            {source && (
              <Badge
                variant="outline"
                className="hidden shrink-0 text-[10px] sm:inline-flex"
                title={
                  showsProxy
                    ? `Data ${activeItem.exchange}:${activeItem.symbol} diambil dari ${sourceSymbol}`
                    : undefined
                }
              >
                {SOURCE_LABELS[source]}
                {showsProxy && ` · ${sourceSymbol}`}
              </Badge>
            )}
            {activeItem.description && (
              <span className="hidden max-w-40 truncate text-xs text-muted-foreground xl:inline">
                {activeItem.description}
              </span>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            {isRealtime && activeTab === "chart" && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-muted-foreground" />
                <span className="text-[10px] tracking-widest text-muted-foreground">
                  REALTIME
                </span>
              </div>
            )}

            {!isRealtime && activeTab === "chart" && candles.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => candleQuery.refetch()}
              >
                <RefreshCw className="size-3" />
                Refresh
              </Button>
            )}

            {activeTab === "news" && (
              <NewsSourceChoose
                value={newsSource}
                onValueChange={setNewsSource}
              />
            )}

            {activeTab === "chart" && (
              <div className="max-w-full overflow-x-auto">
                <IntervalSelector value={interval} onChange={setInterval} />
              </div>
            )}
            <TabsList variant="line">
              <TabsTrigger value="chart">
                <BarChart2 className="size-3" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="news">
                <Newspaper className="size-3" />
                News
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Activity className="size-3" />
                Analysis
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
          <Content
            activeItem={activeItem}
            interval={interval}
            candleQuery={candleQuery}
            newsSource={newsSource}
          />
        </CardContent>
      </Tabs>
    </Card>
  )
}
