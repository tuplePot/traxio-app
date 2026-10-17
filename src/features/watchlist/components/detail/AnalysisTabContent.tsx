import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Activity, Info } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { LoadingScreen } from "@/components/loading-screen"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { Typography } from "@/components/ui/typography"
import type { WatchlistItem } from "@/db/schema/watchlist"
import { cn } from "@/lib/utils"
import { analyzeSymbol } from "@/server/market-analysis"
import type { AnalysisResult } from "@/server/market-analysis"

interface AnalysisTabContentProps {
  activeItem: WatchlistItem
}

const SIGNAL_STYLE: Record<AnalysisResult["signal"], string> = {
  "STRONG BUY": "bg-green-500/15 text-green-600 dark:text-green-400",
  BUY: "bg-green-500/10 text-green-600 dark:text-green-400",
  HOLD: "bg-muted text-muted-foreground",
  SELL: "bg-red-500/10 text-red-600 dark:text-red-400",
  "STRONG SELL": "bg-red-500/15 text-red-600 dark:text-red-400",
}

const SCORE_COLOR = (score: number) =>
  score >= 60 ? "bg-green-500" : score >= 42 ? "bg-yellow-500" : "bg-red-500"

export function AnalysisTabContent({ activeItem }: AnalysisTabContentProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["symbol-analysis", activeItem.symbol, activeItem.exchange],
    queryFn: () =>
      analyzeSymbol({
        data: {
          symbol: activeItem.symbol,
          exchange: activeItem.exchange,
          name: activeItem.description ?? undefined,
        },
      }),
  })

  if (isLoading) {
    return <LoadingScreen isLoading label="ANALYZING..." fullScreen={false} />
  }

  if (!result) {
    return (
      <EmptyState
        icon={<Activity className="size-5" />}
        title="Data tidak cukup"
        description={`Butuh minimal 20 candle historis untuk analisis teknikal ${activeItem.symbol}.`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      <div className="flex items-center gap-3">
        <Badge className={cn("px-2.5 py-1 text-sm font-semibold", SIGNAL_STYLE[result.signal])}>
          {result.signal}
        </Badge>
        <Typography size="xs" color="muted" className="tracking-widest">
          SCORE {result.score}/100
        </Typography>
      </div>

      <Progress value={result.score}>
        <ProgressTrack className="h-1.5">
          <ProgressIndicator className={SCORE_COLOR(result.score)} />
        </ProgressTrack>
      </Progress>

      <Alert>
        <Info />
        <AlertTitle>Cara baca sinyal ini</AlertTitle>
        <AlertDescription>
          <strong>{result.signal}</strong> artinya momentum teknikal jangka
          pendek lagi {result.score >= 60 ? "mendukung" : result.score >= 42 ? "netral/saling tarik" : "melemah"}
          {" "}— bukan instruksi &ldquo;eksekusi order sekarang&rdquo;. Sebelum ambil
          keputusan, kombinasikan minimal dengan: cek tab News (ada katalis
          fundamental atau tidak), cek volume/likuiditas, dan tetap pasang
          stop-loss sendiri. Fitur ini tidak menggantikan riset itu.{" "}
          <Link to="/glossary" className="font-medium text-primary underline-offset-2 hover:underline">
            Bingung istilahnya? Buka Glosarium →
          </Link>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={`RSI(${result.config.rsiPeriod})`} value={result.rsi.toFixed(1)} />
        <Stat label={`SMA${result.maShortLabel}`} value={result.smaShort.toFixed(4)} />
        <Stat label={`SMA${result.maLongLabel}`} value={result.smaLong.toFixed(4)} />
        <Stat label="MACD" value={result.macd.toFixed(4)} />
        <Stat
          label="Momentum"
          value={`${result.momentum5d >= 0 ? "+" : ""}${result.momentum5d.toFixed(1)}%`}
        />
        <Stat
          label="Change 24h"
          value={`${result.change24h >= 0 ? "+" : ""}${result.change24h.toFixed(2)}%`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Typography size="xs" weight="semibold" color="muted" className="tracking-widest uppercase">
          Alasan
        </Typography>
        <ul className="flex flex-col gap-1.5">
          {result.reasons.map((reason, i) => (
            <li key={i} className="text-sm leading-snug">
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <Typography size="xs" color="muted" className="tracking-widest uppercase">
        {label}
      </Typography>
      <Typography size="sm" weight="semibold" className="font-mono">
        {value}
      </Typography>
    </div>
  )
}
