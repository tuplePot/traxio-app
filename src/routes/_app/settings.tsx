import { createFileRoute } from "@tanstack/react-router"
import Content from "@/features/settings/Content"
import { Typography } from "@/components/ui/typography"

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="mx-auto max-w-full space-y-6">
      <div>
        <Typography variant="h1" className="mb-1">
          Pengaturan
        </Typography>
        <Typography variant="muted">
          Konfigurasi tampilan dan preferensi aplikasi
        </Typography>
      </div>

      <Content />
    </div>
  )
}
