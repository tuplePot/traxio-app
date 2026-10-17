import { useState } from "react"
import { cn } from "@/lib/utils"
import type { AnalysisResult } from "@/server/market-analysis"
import { formatPrice } from "@/utils/currency"

// ── Helpers ───────────────────────────────────────────────────────────────────

export function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 74 ? "bg-emerald-500" :
    score >= 60 ? "bg-green-500" :
    score >= 42 ? "bg-yellow-500" :
    score >= 28 ? "bg-orange-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted/50">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[11px] font-bold">{score}</span>
    </div>
  )
}

export function SignalBadge({ signal }: { signal: AnalysisResult["signal"] }) {
  const styles: Record<string, string> = {
    "STRONG BUY": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    "BUY": "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    "HOLD": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    "SELL": "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    "STRONG SELL": "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  }
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider", styles[signal])}>
      {signal}
    </span>
  )
}

export function Change({ value }: { value: number }) {
  if (value > 0) return <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono">+{value.toFixed(2)}%</span>
  if (value < 0) return <span className="text-red-600 dark:text-red-400 text-xs font-mono">{value.toFixed(2)}%</span>
  return <span className="text-muted-foreground text-xs font-mono">0.00%</span>
}

// ── Analysis Card ─────────────────────────────────────────────────────────────

export function AnalysisCard({ item, currency, usdToIdr }: {
  item: AnalysisResult
  currency: string
  usdToIdr: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isIDR = item.currency === "IDR"

  const priceDisplay = isIDR
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.price)
    : formatPrice(item.price, currency, usdToIdr)

  return (
    <div
      className={cn(
        "rounded-xl border p-3 cursor-pointer transition-all",
        "bg-card/60 hover:bg-card/80",
        item.score >= 60 && "border-emerald-500/20",
        item.score < 42 && "border-red-500/20",
        item.score >= 42 && item.score < 60 && "border-border",
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold">{item.symbol}</span>
            <SignalBadge signal={item.signal} />
          </div>
          <p className="text-muted-foreground text-[11px] truncate">{item.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-bold">{priceDisplay}</p>
          <Change value={item.change24h} />
        </div>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Skor Analisis</span>
          <span className="text-[10px]">RSI({item.config.rsiPeriod}) {item.rsi.toFixed(0)}</span>
        </div>
        <ScoreBar score={item.score} />
      </div>

      {expanded && (
        <div className="mt-3 space-y-1 border-t pt-3">
          {item.reasons.map((r, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-muted-foreground">{r}</p>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <span>SMA{item.maShortLabel}: <span className="text-foreground font-mono">{item.smaShort.toFixed(isIDR ? 0 : 4)}</span></span>
            <span>SMA{item.maLongLabel}: <span className="text-foreground font-mono">{item.smaLong.toFixed(isIDR ? 0 : 4)}</span></span>
            <span>MACD: <span className={cn("font-mono", item.macd > item.macdSignal ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{item.macd.toFixed(4)}</span></span>
            <span>Momentum: <span className={cn("font-mono", item.momentum5d > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{item.momentum5d > 0 ? "+" : ""}{item.momentum5d.toFixed(2)}%</span></span>
          </div>
          <p className="mt-2 text-[9px] text-muted-foreground/60 italic">
            * Analisis teknikal bukan saran investasi. Selalu lakukan riset mandiri.
          </p>
        </div>
      )}
    </div>
  )
}
