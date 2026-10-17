import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { getTrade, updateTrade } from "@/server/trades"
import { TradeForm } from "@/features/trades/components/TradeForm"
import { ChevronLeft } from "lucide-react"
import type { TradeInput } from "@/server/trades"

function tradeQueryOptions(id: string) {
  return {
    queryKey: ["trades", id],
    queryFn: () => getTrade({ data: { id } }),
  }
}

export const Route = createFileRoute("/_app/trades/$tradeId/edit")({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(tradeQueryOptions(params.tradeId)),
  component: EditTradePage,
})

function EditTradePage() {
  const { tradeId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const id = tradeId

  const { data: trade } = useSuspenseQuery(tradeQueryOptions(id))

  async function handleSubmit(data: TradeInput) {
    setIsSubmitting(true)
    try {
      await updateTrade({ data: { id, data } })
      await queryClient.invalidateQueries({ queryKey: ["trades"] })
      navigate({ to: "/trades/$tradeId", params: { tradeId } })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/trades/$tradeId"
          params={{ tradeId }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Edit Trade</h1>
          <p className="text-muted-foreground mt-0.5 font-mono text-sm">{trade.symbol}</p>
        </div>
      </div>

      <TradeForm
        defaultValues={{
          symbol: trade.symbol,
          direction: trade.direction,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice ?? undefined,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          outcome: trade.outcome ?? undefined,
          emotionNote: trade.emotionNote ?? undefined,
          setupType: trade.setupType ?? undefined,
          entryMistake: trade.entryMistake,
          closedAt: trade.closedAt ?? undefined,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Simpan Perubahan"
      />
    </div>
  )
}
