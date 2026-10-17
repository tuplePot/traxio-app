import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { getTrade, deleteTrade } from "@/server/trades"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

function tradeQueryOptions(id: string) {
  return {
    queryKey: ["trades", id],
    queryFn: () => getTrade({ data: { id } }),
  }
}

export const Route = createFileRoute("/_app/trades/$tradeId")({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(tradeQueryOptions(params.tradeId)),
  component: TradeDetailPage,
})

function MetaRow({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground text-[10px] tracking-widest">{label}</p>
      <p className={cn("text-sm font-medium", valueClass)}>{value}</p>
    </div>
  )
}

function TradeDetailPage() {
  const { tradeId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const id = tradeId

  const { data: trade } = useSuspenseQuery(tradeQueryOptions(id))

  async function handleDelete() {
    if (!confirm("Hapus trade ini?")) return
    setDeleting(true)
    try {
      await deleteTrade({ data: { id } })
      await queryClient.invalidateQueries({ queryKey: ["trades"] })
      navigate({ to: "/trades" })
    } finally {
      setDeleting(false)
    }
  }

  const outcomeColor =
    trade.outcome === "WIN"
      ? "text-green-500"
      : trade.outcome === "LOSS"
        ? "text-red-500"
        : trade.outcome === "BREAKEVEN"
          ? "text-yellow-600 dark:text-yellow-500"
          : "text-muted-foreground"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/trades" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            {trade.direction === "LONG" ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-red-500" />
            )}
            <h1 className="font-mono text-lg font-semibold">{trade.symbol}</h1>
            <span className={cn("text-sm font-bold", outcomeColor)}>
              {trade.outcome ?? "OPEN"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to="/trades/$tradeId/edit"
            params={{ tradeId }}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Link>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-1.5 size-3.5" />
            {deleting ? "..." : "Hapus"}
          </Button>
        </div>
      </div>

      {/* Price details */}
      <Card>
        <CardHeader className="border-b py-3">
          <span className="text-muted-foreground text-xs tracking-widest">PRICE LEVELS</span>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
          <MetaRow label="ENTRY" value={trade.entryPrice.toFixed(2)} valueClass="font-mono" />
          <MetaRow
            label="EXIT"
            value={trade.exitPrice?.toFixed(2) ?? "—"}
            valueClass="font-mono"
          />
          <MetaRow label="STOP LOSS" value={trade.stopLoss.toFixed(2)} valueClass="font-mono text-red-500" />
          <MetaRow label="TAKE PROFIT" value={trade.takeProfit.toFixed(2)} valueClass="font-mono text-green-500" />
        </CardContent>
      </Card>

      {/* Analysis */}
      <Card>
        <CardHeader className="border-b py-3">
          <span className="text-muted-foreground text-xs tracking-widest">ANALYSIS</span>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3">
          <MetaRow
            label="R:R RATIO"
            value={trade.riskReward != null ? `${trade.riskReward}R` : "—"}
            valueClass="font-mono"
          />
          <MetaRow label="SETUP" value={trade.setupType ?? "—"} />
          <MetaRow
            label="ENTRY MISTAKE"
            value={trade.entryMistake ? "Ya" : "Tidak"}
            valueClass={trade.entryMistake ? "text-red-500" : undefined}
          />
        </CardContent>
        {trade.emotionNote && (
          <>
            <Separator />
            <CardContent className="py-4">
              <MetaRow label="EMOTION NOTE" value={trade.emotionNote} />
            </CardContent>
          </>
        )}
      </Card>

      {/* Timestamps */}
      <Card>
        <CardContent className="flex gap-6 py-3">
          <MetaRow
            label="DIBUAT"
            value={new Date(trade.createdAt).toLocaleString("id-ID")}
          />
          {trade.closedAt && (
            <MetaRow
              label="DITUTUP"
              value={new Date(trade.closedAt).toLocaleString("id-ID")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
