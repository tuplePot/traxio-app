import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ProbabilityResult } from "@/types/trading"

interface ProbabilityPanelProps {
  probability: ProbabilityResult | null
}

const ProgressRow = ({
  label,
  value,
  colorClass,
}: {
  label: string
  value: number
  colorClass: string
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between">
      <span className="text-[10px] tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-xs font-bold", colorClass)}>{value}%</span>
    </div>
    <Progress value={value}>
      <ProgressTrack>
        <ProgressIndicator className={colorClass.replace("text-", "bg-")} />
      </ProgressTrack>
    </Progress>
  </div>
)

export function ProbabilityPanel({ probability }: ProbabilityPanelProps) {
  if (!probability) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs tracking-widest text-muted-foreground">
          CALCULATING...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressRow
        label="CONTINUATION"
        value={probability.trendContinuation}
        colorClass="text-green-500"
      />
      <ProgressRow
        label="REVERSAL RISK"
        value={probability.reversalRisk}
        colorClass="text-red-500"
      />

      <Separator />

      <ProgressRow
        label="BREAKOUT PROB"
        value={probability.breakoutProbability}
        colorClass={
          probability.breakoutProbability > 60
            ? "text-green-500"
            : "text-yellow-600 dark:text-yellow-500"
        }
      />
      <ProgressRow
        label="FAKE BREAKOUT RISK"
        value={probability.fakeBreakoutRisk}
        colorClass={
          probability.fakeBreakoutRisk > 50 ? "text-red-500" : "text-yellow-600 dark:text-yellow-500"
        }
      />
    </div>
  )
}
