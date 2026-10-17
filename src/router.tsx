import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { routeTree } from "./routeTree.gen"
import { makeQueryClient } from "./lib/query-client"

export function getRouter() {
  // Fresh QueryClient per-request — JANGAN buat di luar fungsi ini
  // karena di SSR setiap request harus punya cache sendiri
  const queryClient = makeQueryClient()

  const router = createTanStackRouter({
    routeTree,
    // Expose queryClient via context agar bisa diakses di loaders
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  // Handles SSR dehydration + client hydration otomatis
  // juga wrap QueryClientProvider secara otomatis (wrapQueryClient: true by default)
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }

  // Type context agar queryClient bisa diakses dengan type-safe di loaders
  interface RouterContext {
    queryClient: ReturnType<typeof makeQueryClient>
  }
}
