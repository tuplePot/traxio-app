import { createFileRoute } from "@tanstack/react-router"
import { Typography } from "@/components/ui/typography"
import { GlossaryContent } from "@/features/glossary/GlossaryContent"

export const Route = createFileRoute("/_app/glossary")({
  component: GlossaryPage,
})

function GlossaryPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Typography as="h1" size="lg" weight="semibold">
          Glosarium
        </Typography>
        <Typography variant="muted" className="mt-0.5">
          Penjelasan istilah teknis yang muncul di Traxio: indikator, sinyal, dan istilah trading.
        </Typography>
      </div>
      <GlossaryContent />
    </div>
  )
}
