import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { getWatchlistData } from "@/server/watchlist-groups"
import { WatchlistClient } from "@/features/watchlist/components/WatchlistClient"
import { Typography } from "@/components/ui/typography"

const watchlistQueryOptions = () => ({
  queryKey: ["watchlist"],
  queryFn: () => getWatchlistData(),
})

export const Route = createFileRoute("/_app/watchlist")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(watchlistQueryOptions()),
  component: WatchlistPage,
})

function WatchlistPage() {
  const { data } = useSuspenseQuery(watchlistQueryOptions())

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="hidden md:block">
        <Typography size="lg" weight="bold">
          Watchlist
        </Typography>
        <Typography size="sm" color="muted">
          Pantau pergerakan simbol favoritmu secara realtime
        </Typography>
      </div>
      <WatchlistClient initialItems={data.items} initialGroups={data.groups} />
    </div>
  )
}
