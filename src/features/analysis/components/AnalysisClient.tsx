import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  TrendingUp, RefreshCw, Loader2, Plus,
  Trash2, Briefcase, X, AlertCircle, Settings2,
} from "lucide-react"
import {
  getRecommendations, analyzeSymbol,
  DEFAULT_CONFIG,
} from "@/server/market-analysis"
import type { AnalysisResult, AnalysisConfig } from "@/server/market-analysis"
import { AnalysisCard, ScoreBar, SignalBadge } from "./AnalysisCard"
import { WatchlistAnalysisSection } from "./WatchlistAnalysisSection"
import { addPortfolioPosition, removePortfolioPosition } from "@/server/portfolio"
import type { PortfolioPosition } from "@/db/schema/portfolio"
import type { WatchlistData } from "@/server/watchlist-groups"
import { useSettings } from "@/lib/settings-context"
import { formatPrice } from "@/utils/currency"

// ── Config Bar ────────────────────────────────────────────────────────────────

interface ConfigBarProps {
  config: AnalysisConfig
  onChange: (patch: Partial<AnalysisConfig>) => void
  onRun: () => void
  loading: boolean
}

function ConfigBar({ config, onChange, onRun, loading }: ConfigBarProps) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        {/* Period */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-12">Periode</span>
          {([
            { label: "1 Bln", days: 30 },
            { label: "3 Bln", days: 90 },
            { label: "6 Bln", days: 180 },
            { label: "1 Thn", days: 365 },
          ] as const).map(({ label, days }) => (
            <button
              key={days}
              onClick={() => onChange({ dataDays: days })}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                config.dataDays === days
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* RSI period */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-6">RSI</span>
          {([7, 14, 21] as const).map(p => (
            <button
              key={p}
              onClick={() => onChange({ rsiPeriod: p })}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                config.rsiPeriod === p
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* MA type */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-5">MA</span>
          {([
            { label: "20/50", short: 20, long: 50 },
            { label: "50/200", short: 50, long: 200 },
          ] as const).map(({ label, short, long }) => (
            <button
              key={label}
              onClick={() => onChange({ maShort: short, maLong: long })}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                config.maShort === short
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Candle interval */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-12">Candle</span>
          {([
            { label: "Harian", value: "1d" as const },
            { label: "Mingguan", value: "1w" as const },
          ]).map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onChange({ interval: value })}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                config.interval === value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onRun}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Analisis Ulang
        </button>
      </div>
    </div>
  )
}

// ── Recommendations Panel ─────────────────────────────────────────────────────

type Section = "crypto" | "altcoin" | "idx" | "watchlist"

interface RecommendationsPanelProps {
  config: AnalysisConfig
  onConfigChange: (patch: Partial<AnalysisConfig>) => void
  watchlist: WatchlistData
}

function RecommendationsPanel({ config, onConfigChange, watchlist }: RecommendationsPanelProps) {
  const { settings } = useSettings()
  const [data, setData] = useState<Awaited<ReturnType<typeof getRecommendations>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<Section>("crypto")
  // Config & run counter yang dipakai section watchlist (ikut tombol Analisis Ulang)
  const [runConfig, setRunConfig] = useState<AnalysisConfig>(config)
  const [runId, setRunId] = useState(0)

  async function load() {
    setLoading(true)
    setRunConfig(config)
    setRunId((n) => n + 1)
    try {
      setData(await getRecommendations({ data: { config } }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sections = [
    { key: "crypto" as const, label: "Top Crypto", items: data?.topCrypto ?? [] },
    { key: "altcoin" as const, label: "Altcoin (<$5)", items: (data?.altcoins ?? []).filter(i => i.price < 5) },
    { key: "idx" as const, label: "Saham IDX", items: data?.idxStocks ?? [] },
    { key: "watchlist" as const, label: "Watchlist Saya", items: [] },
  ]

  const activeItems = sections.find(s => s.key === activeSection)?.items ?? []
  const buySignals = activeItems.filter(i => i.signal === "STRONG BUY" || i.signal === "BUY")

  return (
    <div className="space-y-4">
      {/* Config bar */}
      <ConfigBar config={config} onChange={onConfigChange} onRun={load} loading={loading} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs">
            Analisis teknikal berbasis RSI · MACD · SMA. Klik kartu untuk detail.
          </p>
          {data && (
            <p className="text-muted-foreground text-[10px] mt-0.5">
              Diperbarui: {new Date(data.fetchedAt).toLocaleTimeString("id-ID")} · {data.config.dataDays} hari · RSI({data.config.rsiPeriod}) · MA {data.config.maShort}/{data.config.maLong}
            </p>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 flex-wrap">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeSection === s.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {s.label}
            {s.key === "watchlist" && watchlist.items.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">({watchlist.items.length})</span>
            )}
          </button>
        ))}
      </div>

      {activeSection === "watchlist" ? (
        <WatchlistAnalysisSection
          items={watchlist.items}
          groups={watchlist.groups}
          config={runConfig}
          runId={runId}
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            Mengambil data & menghitung indikator... (~5-10 detik)
          </p>
        </div>
      ) : (
        <>
          {buySignals.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                🎯 {buySignals.length} sinyal beli terdeteksi
              </p>
              <p className="text-[11px] text-muted-foreground">
                {buySignals.map(i => i.symbol).join(" · ")}
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeItems.map(item => (
              <AnalysisCard
                key={`${item.exchange}:${item.symbol}`}
                item={item}
                currency={settings.currency}
                usdToIdr={settings.usdToIdr}
              />
            ))}
          </div>

          {activeItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <AlertCircle className="size-5 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Gagal mengambil data. Coba Analisis Ulang.</p>
            </div>
          )}
        </>
      )}

      <Card>
        <CardContent className="py-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            ⚠️ <strong>Disclaimer:</strong> Analisis ini hanya berdasarkan indikator teknikal (RSI, MACD, SMA) dan bukan merupakan saran investasi.
            Pasar saham dan kripto memiliki risiko tinggi. Selalu lakukan riset mandiri (DYOR) dan konsultasikan dengan ahli keuangan sebelum berinvestasi.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Portfolio Panel ───────────────────────────────────────────────────────────

interface EnrichedPosition extends PortfolioPosition {
  analysis: AnalysisResult | null
  loading: boolean
}

function PortfolioPanel({ initialPortfolio }: { initialPortfolio: PortfolioPosition[] }) {
  const queryClient = useQueryClient()
  const { settings } = useSettings()
  const [positions, setPositions] = useState<EnrichedPosition[]>(
    initialPortfolio.map(p => ({ ...p, analysis: null, loading: true }))
  )
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    symbol: "", exchange: "BINANCE", quantity: "", buyPrice: "", buyDate: "", notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    positions.forEach((pos, idx) => {
      if (!pos.loading) return
      analyzeSymbol({ data: { symbol: pos.symbol, exchange: pos.exchange } })
        .then(analysis => {
          setPositions(prev => prev.map((p, i) => i === idx ? { ...p, analysis, loading: false } : p))
        })
        .catch(() => {
          setPositions(prev => prev.map((p, i) => i === idx ? { ...p, loading: false } : p))
        })
    })
  }, []) // only on mount

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.symbol || !form.quantity || !form.buyPrice || !form.buyDate) return
    setSubmitting(true)
    try {
      const pos = await addPortfolioPosition({
        data: {
          symbol: form.symbol,
          exchange: form.exchange,
          quantity: parseFloat(form.quantity),
          buyPrice: parseFloat(form.buyPrice),
          buyDate: form.buyDate,
          notes: form.notes || undefined,
        },
      })
      if (pos) {
        const enriched: EnrichedPosition = { ...pos, analysis: null, loading: true }
        setPositions(prev => [...prev, enriched])
        analyzeSymbol({ data: { symbol: pos.symbol, exchange: pos.exchange } })
          .then(analysis => {
            setPositions(prev => prev.map(p => p.id === pos.id ? { ...p, analysis, loading: false } : p))
          })
          .catch(() => {
            setPositions(prev => prev.map(p => p.id === pos.id ? { ...p, loading: false } : p))
          })
      }
      setForm({ symbol: "", exchange: "BINANCE", quantity: "", buyPrice: "", buyDate: "", notes: "" })
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ["portfolio"] })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id: string) {
    await removePortfolioPosition({ data: { id } })
    setPositions(prev => prev.filter(p => p.id !== id))
    queryClient.invalidateQueries({ queryKey: ["portfolio"] })
  }

  function formatPositionPrice(price: number, exchange: string): string {
    if (exchange === "IDX") {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price)
    }
    return formatPrice(price, settings.currency, settings.usdToIdr)
  }

  const totals = positions.reduce((acc, pos) => {
    const currentPrice = pos.analysis?.price ?? pos.buyPrice
    const invested = pos.buyPrice * pos.quantity
    const current = currentPrice * pos.quantity
    return { invested: acc.invested + invested, current: acc.current + current }
  }, { invested: 0, current: 0 })
  const totalPnl = totals.current - totals.invested
  const totalPnlPct = totals.invested > 0 ? (totalPnl / totals.invested) * 100 : 0

  return (
    <div className="space-y-4">
      {positions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Total Investasi", value: `${positions.length} posisi` },
            { label: "Estimasi P&L", value: totalPnlPct > 0 ? `+${totalPnlPct.toFixed(2)}%` : `${totalPnlPct.toFixed(2)}%`, color: totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" },
            { label: "Sinyal Beli Aktif", value: `${positions.filter(p => p.analysis && (p.analysis.signal === "BUY" || p.analysis.signal === "STRONG BUY")).length} posisi`, color: "text-primary" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="py-3">
                <p className="text-muted-foreground text-[10px] tracking-wider uppercase">{label}</p>
                <p className={cn("mt-1 text-base font-bold sm:text-lg", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {positions.length === 0 ? "Belum ada posisi. Tambah investasi kamu." : `${positions.length} posisi aktif`}
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            showForm ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {showForm ? <X className="size-3" /> : <Plus className="size-3" />}
          {showForm ? "Tutup" : "Tambah Posisi"}
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Input Investasi</CardTitle>
            <CardDescription>Masukkan detail pembelian saham/kripto kamu</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Simbol</label>
                <input
                  required value={form.symbol}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="BTCUSDT / BBCA"
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Exchange</label>
                <select
                  value={form.exchange}
                  onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="BINANCE">Binance (Crypto)</option>
                  <option value="IDX">IDX (Saham Indo)</option>
                  <option value="NYSE">NYSE</option>
                  <option value="NASDAQ">NASDAQ</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Jumlah {form.exchange === "IDX" ? "(lembar saham)" : "(koin/unit)"}
                </label>
                <input
                  required type="number" step="any" min="0" value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder={form.exchange === "IDX" ? "100" : "0.001"}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Harga Beli per unit ({form.exchange === "IDX" ? "IDR" : "USD"})
                </label>
                <input
                  required type="number" step="any" min="0" value={form.buyPrice}
                  onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))}
                  placeholder={form.exchange === "IDX" ? "9500" : "95000"}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tanggal &amp; Jam Beli</label>
                <input
                  required type="datetime-local" value={form.buyDate}
                  onChange={e => setForm(f => ({ ...f, buyDate: e.target.value }))}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Catatan (opsional)</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Alasan beli..."
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between border-t pt-3 mt-1">
                {form.quantity && form.buyPrice && (
                  <p className="text-xs text-muted-foreground">
                    Total investasi: <span className="text-foreground font-semibold">
                      {formatPositionPrice(parseFloat(form.quantity || "0") * parseFloat(form.buyPrice || "0"), form.exchange)}
                    </span>
                  </p>
                )}
                <button
                  type="submit" disabled={submitting}
                  className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  Simpan Posisi
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {positions.map(pos => {
          const currentPrice = pos.analysis?.price ?? null
          const invested = pos.buyPrice * pos.quantity
          const current = currentPrice !== null ? currentPrice * pos.quantity : null
          const pnl = current !== null ? current - invested : null
          const pnlPct = pnl !== null ? (pnl / invested) * 100 : null
          const daysHeld = Math.floor(
            (Date.now() - new Date(pos.buyDate).getTime()) / (1000 * 60 * 60 * 24)
          )

          return (
            <Card key={pos.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold">{pos.symbol}</span>
                      <span className="text-muted-foreground text-[10px] tracking-widest">{pos.exchange}</span>
                      {pos.analysis && <SignalBadge signal={pos.analysis.signal} />}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Beli: {formatPositionPrice(pos.buyPrice, pos.exchange)} × {pos.quantity} · {daysHeld} hari lalu
                    </p>
                    {pos.notes && (
                      <p className="text-muted-foreground text-[10px] mt-0.5 italic">"{pos.notes}"</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {pos.loading ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground ml-auto" />
                    ) : currentPrice !== null ? (
                      <>
                        <p className="font-mono font-bold text-sm">
                          {formatPositionPrice(currentPrice, pos.exchange)}
                        </p>
                        {pnlPct !== null && (
                          <p className={cn("font-mono text-sm font-bold",
                            pnlPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">Gagal fetch</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemove(pos.id)}
                    className="text-muted-foreground/40 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {pos.analysis && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Probabilitas naik (teknikal)</span>
                      <span>RSI {pos.analysis.rsi.toFixed(0)}</span>
                    </div>
                    <ScoreBar score={pos.analysis.score} />
                    {current !== null && pnl !== null && (
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>Nilai sekarang: <span className="text-foreground font-semibold">{formatPositionPrice(current, pos.exchange)}</span></span>
                        <span>P&L: <span className={cn("font-semibold", pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                          {pnl >= 0 ? "+" : ""}{formatPositionPrice(Math.abs(pnl), pos.exchange)}
                        </span></span>
                      </div>
                    )}
                    {pos.analysis.reasons[0] && (
                      <p className="text-[10px] text-muted-foreground mt-1">{pos.analysis.reasons[0]}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────

type Tab = "recommendations" | "portfolio"

interface AnalysisClientProps {
  initialPortfolio: PortfolioPosition[]
  initialWatchlist?: WatchlistData
}

export function AnalysisClient({ initialPortfolio, initialWatchlist }: AnalysisClientProps) {
  const [tab, setTab] = useState<Tab>("recommendations")
  const [config, setConfig] = useState<AnalysisConfig>(DEFAULT_CONFIG)

  function patchConfig(patch: Partial<AnalysisConfig>) {
    setConfig(prev => ({ ...prev, ...patch }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Analisis Pasar</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Rekomendasi berbasis indikator teknikal · Portofolio tracker
          </p>
        </div>
        <Settings2 className="size-4 text-muted-foreground" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border bg-muted/20 p-1 w-fit">
        <button
          onClick={() => setTab("recommendations")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
            tab === "recommendations" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <TrendingUp className="size-4" />
          Rekomendasi
        </button>
        <button
          onClick={() => setTab("portfolio")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
            tab === "portfolio" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Briefcase className="size-4" />
          Portofolio Saya
        </button>
      </div>

      {tab === "recommendations" && (
        <RecommendationsPanel
          config={config}
          onConfigChange={patchConfig}
          watchlist={initialWatchlist ?? { items: [], groups: [] }}
        />
      )}
      {tab === "portfolio" && <PortfolioPanel initialPortfolio={initialPortfolio} />}
    </div>
  )
}
