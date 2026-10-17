import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSR: hindari refetch langsung saat hydration client
        staleTime: 60 * 1000,
        // Simpan cache 5 menit setelah tidak ada subscriber
        gcTime: 5 * 60 * 1000,
        // Jangan retry di server, hanya di client
        retry: (failureCount, _error) => {
          if (typeof window === "undefined") return false
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
