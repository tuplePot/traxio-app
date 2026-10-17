import type { UseQueryResult } from "@tanstack/react-query"
import { TabsContent } from "@/components/ui/tabs"
import type { WatchlistItem } from "@/db/schema/watchlist"
import type { NewsSourceId } from "@/features/news/constants"
import { NewsPanel } from "@/features/news/NewsPanel"
import type { CandleResult } from "@/types/market"
import type { Interval } from "../../types"
import { AnalysisTabContent } from "./AnalysisTabContent"
import { ChartTabContent } from "./ChartTabContent"

interface ContentProps {
  activeItem: WatchlistItem
  interval: Interval
  candleQuery: UseQueryResult<CandleResult>
  newsSource: NewsSourceId
}

/**
 * Body per-tab dari WatchlistDetailPanel. Nambah tab baru = tambah satu
 * <TabsContent> di sini + satu <TabsTrigger> di WatchlistDetailPanel —
 * tidak perlu sentuh shell/header.
 */
export function Content({
  activeItem,
  interval,
  candleQuery,
  newsSource,
}: ContentProps) {
  return (
    <>
      <TabsContent value="chart" className="h-full">
        <ChartTabContent
          activeItem={activeItem}
          interval={interval}
          candleQuery={candleQuery}
        />
      </TabsContent>
      <TabsContent value="news" className="h-full overflow-y-auto">
        <NewsPanel symbol={activeItem.symbol} source={newsSource} />
      </TabsContent>
      <TabsContent value="analysis" className="h-full overflow-y-auto">
        <AnalysisTabContent activeItem={activeItem} />
      </TabsContent>
    </>
  )
}
