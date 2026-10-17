import { ExternalLink } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { fetchCmcNews, fetchNews } from "@/server/news"
import { relativeTime } from "@/utils/date"
import { SentimentIcon } from "@/features/news/SentimentIcon"
import { Typography } from "@/components/ui/typography"
import { EmptyState } from "@/components/empty-state"
import { LoadingScreen } from "@/components/loading-screen"
import { CmcTldrCard } from "./CmcTldrCard"
import type { NewsSourceId } from "./constants"
import { isCmcTldrItem } from "./interface"
import type { CmcTldrItem, NewsItem } from "./interface"

interface NewsPanelProps {
  symbol: string
  source: NewsSourceId
}

export function NewsPanel({ symbol, source }: NewsPanelProps) {
  const isCmc = source === "coinmarketcap"

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["news", symbol, source],
    queryFn: (): Promise<(NewsItem | CmcTldrItem)[]> =>
      isCmc ? fetchCmcNews({ data: { symbol } }) : fetchNews({ data: { symbol } }),
  })

  if (items.length === 0 && !isLoading) {
    return (
      <EmptyState
        title="No news found"
        description={
          isCmc
            ? `Tidak ada TLDR CoinMarketCap untuk ${symbol}.`
            : `Could not find any recent articles for ${symbol}.`
        }
      />
    )
  }

  return (
    <LoadingScreen
      isLoading={isLoading}
      label={isCmc ? "LOADING TLDR..." : "LOADING REAL NEWS..."}
      fullScreen={false}
    >
      <div className="flex flex-col divide-y overflow-y-auto">
        {items.map((item) =>
          isCmcTldrItem(item) ? (
            <CmcTldrCard key={item.id} item={item} />
          ) : (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              <SentimentIcon sentiment={item.sentiment} />

              <div className="min-w-0 flex-1">
                <Typography
                  size="sm"
                  className="line-clamp-2 leading-snug transition-colors group-hover:text-primary"
                >
                  {item.title}
                </Typography>
                <div className="mt-1.5 flex items-center gap-2">
                  <Typography
                    size="xs"
                    weight="medium"
                    color="muted"
                    className="tracking-widest"
                  >
                    {item.source.title}
                  </Typography>
                  <Typography size="xs" color="muted">
                    ·
                  </Typography>
                  <Typography size="xs" color="muted">
                    {relativeTime(item.publishedAt)}
                  </Typography>
                </div>
              </div>

              <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
            </a>
          )
        )}

        <div className="border-t px-4 py-3 text-center">
          <Typography variant="caption" className="tracking-widest uppercase">
            {isCmc
              ? "News TLDR sourced from CoinMarketCap"
              : "Real-time news sourced from Google News"}
          </Typography>
        </div>
      </div>
    </LoadingScreen>
  )
}
