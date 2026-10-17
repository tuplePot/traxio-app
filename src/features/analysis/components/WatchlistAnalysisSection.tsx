import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, CheckCheck, Eraser, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import type { WatchlistItem } from "@/db/schema/watchlist"
import type { WatchlistGroup } from "@/db/schema/watchlist-groups"
import { useSettings } from "@/lib/settings-context"
import { analyzeCustomSymbols } from "@/server/market-analysis"
import type { AnalysisConfig } from "@/server/market-analysis"
import { AnalysisCard } from "./AnalysisCard"

interface WatchlistAnalysisSectionProps {
  items: WatchlistItem[]
  groups: WatchlistGroup[]
  /** Config yang sudah di-"run" (tombol Analisis Ulang). */
  config: AnalysisConfig
  /** Naik setiap kali Analisis Ulang ditekan → paksa fetch ulang. */
  runId: number
}

// "all" | "ungrouped" | id grup (UUID)
type GroupFilter = "all" | "ungrouped" | (string & {})

const EXCLUDED_STORAGE_KEY = "traxio:analysis:watchlist-excluded"

const itemKey = (i: Pick<WatchlistItem, "exchange" | "symbol">) => `${i.exchange}:${i.symbol}`

function loadExcluded(): Set<string> {
  try {
    const raw = localStorage.getItem(EXCLUDED_STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveExcluded(excluded: Set<string>) {
  try {
    localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify([...excluded]))
  } catch {
    // storage tidak tersedia (private mode) — pilihan cukup berlaku di sesi ini
  }
}

export function WatchlistAnalysisSection({
  items,
  groups,
  config,
  runId,
}: WatchlistAnalysisSectionProps) {
  const { settings } = useSettings()
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all")
  // Simpan yang DIKECUALIKAN, jadi simbol baru di watchlist otomatis ikut dianalisis
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  useEffect(() => setExcluded(loadExcluded()), [])

  function updateExcluded(next: Set<string>) {
    setExcluded(next)
    saveExcluded(next)
  }

  const groupItems = useMemo(
    () =>
      items.filter((i) =>
        groupFilter === "all"
          ? true
          : groupFilter === "ungrouped"
            ? i.groupId === null
            : i.groupId === groupFilter
      ),
    [items, groupFilter]
  )
  const selected = groupItems.filter((i) => !excluded.has(itemKey(i)))
  const selectedKeys = selected.map(itemKey).sort()

  const query = useQuery({
    queryKey: ["watchlist-analysis", config, selectedKeys, runId],
    queryFn: () =>
      analyzeCustomSymbols({
        data: {
          config,
          symbols: selected.map((i) => ({
            symbol: i.symbol,
            exchange: i.exchange,
            name: i.description ?? i.symbol,
          })),
        },
      }),
    enabled: selected.length > 0,
    staleTime: 5 * 60_000,
  })

  function toggle(item: WatchlistItem) {
    const next = new Set(excluded)
    const key = itemKey(item)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    updateExcluded(next)
  }

  function setAll(include: boolean) {
    const next = new Set(excluded)
    for (const i of groupItems) {
      if (include) next.delete(itemKey(i))
      else next.add(itemKey(i))
    }
    updateExcluded(next)
  }

  const hasUngrouped = items.some((i) => i.groupId === null)
  const filters: Array<{ value: GroupFilter; label: string; count: number }> = [
    { value: "all", label: "Semua", count: items.length },
    ...groups.map((g) => ({
      value: g.id,
      label: g.name,
      count: items.filter((i) => i.groupId === g.id).length,
    })),
    ...(hasUngrouped
      ? [{
          value: "ungrouped" as const,
          label: "Tanpa grup",
          count: items.filter((i) => i.groupId === null).length,
        }]
      : []),
  ]

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <AlertCircle className="size-5 text-muted-foreground" />
        <Typography size="sm" color="muted">Belum ada simbol di watchlist.</Typography>
        <Typography variant="caption">Tambahkan simbol di menu Watchlist terlebih dahulu.</Typography>
      </div>
    )
  }

  const results = query.data?.results ?? []
  const unavailable = query.data?.unavailable ?? []
  const buySignals = results.filter((i) => i.signal === "STRONG BUY" || i.signal === "BUY")

  return (
    <div className="space-y-4">
      {/* Pilihan simbol yang dianalisis */}
      <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-1">
          <Typography variant="caption" className="me-1 w-12">Grup</Typography>
          {filters.map((f) => (
            <Button
              key={String(f.value)}
              size="xs"
              variant={groupFilter === f.value ? "secondary" : "ghost"}
              onClick={() => setGroupFilter(f.value)}
            >
              {f.label}
              <span className="text-muted-foreground">({f.count})</span>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Typography variant="caption" className="me-1 w-12">Simbol</Typography>
          {groupItems.map((item) => {
            const active = !excluded.has(itemKey(item))
            return (
              <Button
                key={item.id}
                size="xs"
                variant={active ? "outline" : "ghost"}
                aria-pressed={active}
                title={`${item.exchange}:${item.symbol}${item.description ? ` — ${item.description}` : ""}`}
                className={active ? "font-mono" : "font-mono text-muted-foreground/50 line-through"}
                onClick={() => toggle(item)}
              >
                {item.symbol}
              </Button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <Typography variant="caption">
            {selected.length} dari {groupItems.length} simbol dianalisis · klik simbol untuk
            masukkan/keluarkan dari analisis
          </Typography>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setAll(true)}>
              <CheckCheck />
              Pilih semua
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setAll(false)}>
              <Eraser />
              Kosongkan
            </Button>
          </div>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <AlertCircle className="size-5 text-muted-foreground" />
          <Typography size="sm" color="muted">Belum ada simbol yang dipilih untuk dianalisis.</Typography>
        </div>
      ) : query.isFetching && !query.data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <Typography variant="caption">
            Menganalisis {selected.length} simbol watchlist...
          </Typography>
        </div>
      ) : (
        <>
          {query.isFetching && (
            <div className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
              <Typography variant="caption">Memperbarui...</Typography>
            </div>
          )}

          {buySignals.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <Typography size="xs" weight="semibold" className="mb-1 text-emerald-600 dark:text-emerald-400">
                🎯 {buySignals.length} sinyal beli terdeteksi
              </Typography>
              <Typography variant="caption">
                {buySignals.map((i) => i.symbol).join(" · ")}
              </Typography>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => (
              <AnalysisCard
                key={`${item.exchange}:${item.symbol}`}
                item={item}
                currency={settings.currency}
                usdToIdr={settings.usdToIdr}
              />
            ))}
          </div>

          {unavailable.length > 0 && (
            <Alert>
              <AlertCircle />
              <AlertTitle>{unavailable.length} simbol belum bisa dianalisis</AlertTitle>
              <AlertDescription>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {unavailable.map((u) => (
                    <Badge key={`${u.exchange}:${u.symbol}`} variant="outline" title={u.reason}>
                      {u.exchange}:{u.symbol} — {u.reason}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
