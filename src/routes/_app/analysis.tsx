import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { getPortfolio } from "@/server/portfolio"
import { getWatchlistData } from "@/server/watchlist-groups"
import { AnalysisClient } from "@/features/analysis/components/AnalysisClient"

const portfolioQueryOptions = () => ({
  queryKey: ["portfolio"],
  queryFn: () => getPortfolio(),
})

const watchlistQueryOptions = () => ({
  queryKey: ["watchlist-data"],
  queryFn: () => getWatchlistData(),
})

export const Route = createFileRoute("/_app/analysis")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(portfolioQueryOptions()),
      queryClient.ensureQueryData(watchlistQueryOptions()),
    ]),
  component: AnalysisPage,
})

function AnalysisPage() {
  const { data: portfolio } = useSuspenseQuery(portfolioQueryOptions())
  const { data: watchlist } = useSuspenseQuery(watchlistQueryOptions())
  return <AnalysisClient initialPortfolio={portfolio} initialWatchlist={watchlist} />
}
