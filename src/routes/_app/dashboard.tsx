import { createFileRoute } from "@tanstack/react-router"
import { DashboardClient } from "@/features/market-analysis/components/DashboardClient"

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  return <DashboardClient />
}
