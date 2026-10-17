import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createTrade } from "@/server/trades"
import { TradeForm } from "@/features/trades/components/TradeForm"
import { ChevronLeft } from "lucide-react"
import type { TradeInput } from "@/server/trades"

export const Route = createFileRoute("/_app/trades/create")({
  component: CreateTradePage,
})

function CreateTradePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: TradeInput) {
    setIsSubmitting(true)
    try {
      await createTrade({ data })
      await queryClient.invalidateQueries({ queryKey: ["trades"] })
      navigate({ to: "/trades" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/trades" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Catat Trade Baru</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Isi detail entry trade kamu</p>
        </div>
      </div>

      <TradeForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitLabel="Catat Trade" />
    </div>
  )
}
