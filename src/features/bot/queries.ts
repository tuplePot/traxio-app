import { getBotDecisions, getBotOverview, getBotSymbols } from "@/server/bot"

export const botOverviewQueryOptions = () => ({
  queryKey: ["bot-overview"],
  queryFn: () => getBotOverview(),
  refetchInterval: 60 * 1000,
})

export const botDecisionsQueryOptions = () => ({
  queryKey: ["bot-decisions"],
  queryFn: () => getBotDecisions({ data: { limitRuns: 15 } }),
})

export const botSymbolsQueryOptions = () => ({
  queryKey: ["bot-symbols"],
  queryFn: () => getBotSymbols(),
})

/** Semua query yang berubah setelah bot jalan / config diubah. */
export const BOT_QUERY_KEYS = [
  ["bot-overview"],
  ["bot-decisions"],
  ["notifications"],
  ["trades"],
]

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null) return "—"
  return n >= 100 ? n.toFixed(2) : n.toPrecision(5)
}
