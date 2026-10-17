import { createFileRoute } from "@tanstack/react-router"
import Content from "@/features/bot/Content"
import { Typography } from "@/components/ui/typography"

export const Route = createFileRoute("/_app/bot")({
  component: BotPage,
})

function BotPage() {
  return (
    <div className="mx-auto max-w-full space-y-6">
      <div>
        <Typography variant="h1" className="mb-1">
          Bot Paper Trading
        </Typography>
        <Typography variant="muted">
          Strategi tren 4H + pullback, LONG saja, 1x, dicek otomatis tiap 4 jam
          (simulasi)
        </Typography>
      </div>

      <Content />
    </div>
  )
}
