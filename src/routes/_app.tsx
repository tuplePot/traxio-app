import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { SettingsProvider } from "@/lib/settings-context"
import { getSettings } from "@/server/settings"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { NotificationWatcher } from "@/features/notifications/NotificationWatcher"

const getSession = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  return session
})

export const settingsQueryOptions = () => ({
  queryKey: ["settings"],
  queryFn: () => getSettings(),
  staleTime: 60 * 60 * 1000,
})

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(settingsQueryOptions()),
  component: AppLayout,
})

function AppLayout() {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions())
  const [collapsed, setCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <SettingsProvider settings={settings}>
      <TooltipProvider>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            isMobileOpen={isMobileOpen}
            onMobileClose={() => setIsMobileOpen(false)}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setIsMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <NotificationWatcher />
        <Toaster position="top-right" closeButton />
      </TooltipProvider>
    </SettingsProvider>
  )
}
