import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { MarketScore } from "@/types/trading"

interface ScorePanelProps {
  score: MarketScore | null
}

export function ScorePanel({ score }: ScorePanelProps) {
  if (!score) {
    return (
      <Card className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-xs tracking-widest">LOADING DATA...</p>
      </Card>
    )
  }

  const { bullishScore, bearishScore, confidenceLevel, trendStrength, dominance, signals } = score

  const confidenceColor =
    confidenceLevel === "High"
      ? "text-green-500"
      : confidenceLevel === "Low"
        ? "text-red-500"
        : "text-yellow-600 dark:text-yellow-500"

  const dominanceColor =
    dominance === "Buyer" ? "text-green-500" : dominance === "Seller" ? "text-red-500" : "text-muted-foreground"

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center gap-2 border-b py-3">
        <Zap className="text-muted-foreground size-3.5 shrink-0" />
        <span className="text-muted-foreground text-xs font-medium tracking-widest">MARKET SCORING</span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-auto py-4">
        {/* Bullish */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-xs font-semibold text-green-500">BULLISH</span>
            <span className="text-muted-foreground text-xs">{bullishScore}%</span>
          </div>
          <Progress value={bullishScore}>
            <ProgressTrack>
              <ProgressIndicator className="bg-green-500" />
            </ProgressTrack>
          </Progress>
        </div>

        {/* Bearish */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-xs font-semibold text-red-500">BEARISH</span>
            <span className="text-muted-foreground text-xs">{bearishScore}%</span>
          </div>
          <Progress value={bearishScore}>
            <ProgressTrack>
              <ProgressIndicator className="bg-red-500" />
            </ProgressTrack>
          </Progress>
        </div>

        <Separator />

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest">CONFIDENCE</p>
            <p className={cn("text-xs font-bold", confidenceColor)}>{confidenceLevel.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest">STRENGTH</p>
            <p className="text-xs font-bold">{trendStrength.toUpperCase()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground text-[10px] tracking-widest">DOMINANCE</p>
            <p className={cn("text-xs font-bold", dominanceColor)}>{dominance.toUpperCase()}</p>
          </div>
        </div>

        <Separator />

        {/* Signals */}
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-[10px] tracking-widest">ACTIVE SIGNALS</p>
          {signals.map((sig, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {sig.type === "Bullish" ? (
                <TrendingUp className="mt-0.5 size-3 shrink-0 text-green-500" />
              ) : sig.type === "Bearish" ? (
                <TrendingDown className="mt-0.5 size-3 shrink-0 text-red-500" />
              ) : (
                <Minus className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              )}
              <div className="flex gap-1 text-[10px] leading-tight">
                <span className="text-muted-foreground shrink-0">[{sig.indicator}]</span>
                <span>{sig.message}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
