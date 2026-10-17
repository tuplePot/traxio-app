import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { getTrades } from "@/server/trades"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Plus, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Trade } from "@/db/schema/trades"

const tradesQueryOptions = () => ({
  queryKey: ["trades"],
  queryFn: () => getTrades(),
})

export const Route = createFileRoute("/_app/trades/")({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(tradesQueryOptions()),
  component: TradesPage,
})

function OutcomeBadge({ outcome }: { outcome: Trade["outcome"] }) {
  if (!outcome) return <span className="text-muted-foreground text-xs">OPEN</span>
  return (
    <span
      className={cn(
        "text-xs font-bold",
        outcome === "WIN" && "text-green-500",
        outcome === "LOSS" && "text-red-500",
        outcome === "BREAKEVEN" && "text-yellow-600 dark:text-yellow-500",
      )}
    >
      {outcome}
    </span>
  )
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <Link to="/trades/$tradeId" params={{ tradeId: String(trade.id) }}>
      <div className="hover:bg-muted/40 flex items-center gap-4 px-4 py-3 transition-colors">
        {/* Direction icon */}
        <div className="w-5 shrink-0">
          {trade.direction === "LONG" ? (
            <TrendingUp className="size-4 text-green-500" />
          ) : (
            <TrendingDown className="size-4 text-red-500" />
          )}
        </div>

        {/* Symbol + setup */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold">{trade.symbol}</p>
          <p className="text-muted-foreground truncate text-[10px] tracking-widest">
            {trade.setupType ?? "—"}
          </p>
        </div>

        {/* Entry / exit */}
        <div className="hidden text-right sm:block">
          <p className="font-mono text-xs">{trade.entryPrice.toFixed(2)}</p>
          <p className="text-muted-foreground font-mono text-[10px]">
            {trade.exitPrice?.toFixed(2) ?? "—"}
          </p>
        </div>

        {/* R:R */}
        <div className="hidden w-12 text-right md:block">
          <p className="font-mono text-xs">{trade.riskReward != null ? `${trade.riskReward}R` : "—"}</p>
        </div>

        {/* Outcome */}
        <div className="w-16 text-right">
          <OutcomeBadge outcome={trade.outcome} />
        </div>

        {/* Date */}
        <div className="hidden w-24 text-right lg:block">
          <p className="text-muted-foreground text-[10px]">
            {new Date(trade.createdAt).toLocaleDateString("id-ID")}
          </p>
        </div>
      </div>
    </Link>
  )
}

function TradeStats({ trades }: { trades: Trade[] }) {
  const closed = trades.filter((t) => t.outcome != null)
  const wins = closed.filter((t) => t.outcome === "WIN").length
  const losses = closed.filter((t) => t.outcome === "LOSS").length
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0
  const avgRR =
    closed.length > 0
      ? (closed.reduce((sum, t) => sum + (t.riskReward ?? 0), 0) / closed.length).toFixed(2)
      : "—"

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "TOTAL", value: trades.length },
        { label: "WIN RATE", value: `${winRate}%` },
        { label: "WINS / LOSSES", value: `${wins} / ${losses}` },
        { label: "AVG R:R", value: avgRR !== "—" ? `${avgRR}R` : "—" },
      ].map(({ label, value }) => (
        <Card key={label}>
          <CardContent className="py-3">
            <p className="text-muted-foreground text-[10px] tracking-widest">{label}</p>
            <p className="mt-0.5 font-mono text-lg font-bold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TradesPage() {
  const { data: trades } = useSuspenseQuery(tradesQueryOptions())

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Trading Journal</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Riwayat dan analisis trade kamu</p>
        </div>
        <Link to="/trades/create" className={buttonVariants({ size: "sm" })}>
          <Plus className="mr-1.5 size-3.5" />
          New Trade
        </Link>
      </div>

      {/* Stats */}
      {trades.length > 0 && <TradeStats trades={trades} />}

      {/* List */}
      <Card>
        <CardHeader className="border-b py-3">
          <span className="text-muted-foreground text-xs tracking-widest">
            ALL TRADES ({trades.length})
          </span>
        </CardHeader>

        {trades.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">Belum ada trade tercatat.</p>
            <Link to="/trades/create" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Catat trade pertamamu
            </Link>
          </CardContent>
        ) : (
          <div className="divide-y">
            {trades.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
