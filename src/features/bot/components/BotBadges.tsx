import { Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BotDecision } from "@/db/schema/bot"
import { COMPLIANCE_LABELS } from "../strategy"
import type { ComplianceCheck } from "../strategy"
import type { Tier } from "../constants"

const TIER_CLASS: Record<Tier, string> = {
  CORE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  GROWTH: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  SPEC: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

export function TierBadge({ tier }: { tier: Tier }) {
  return <Badge className={TIER_CLASS[tier]}>{tier}</Badge>
}

const DECISION_LABEL: Record<BotDecision["decision"], string> = {
  BUY: "BUY",
  NO_TRADE: "Cash",
  BLOCKED: "Diblokir",
  AI_REJECTED: "Ditolak AI",
  AI_WAIT: "AI: tunggu",
  AI_ERROR: "AI error",
  DATA_ERROR: "Data error",
}

export function DecisionBadge({
  decision,
}: {
  decision: BotDecision["decision"]
}) {
  const variant =
    decision === "BUY"
      ? "default"
      : decision === "NO_TRADE"
        ? "secondary"
        : decision.startsWith("AI")
          ? "outline"
          : "destructive"
  return <Badge variant={variant}>{DECISION_LABEL[decision]}</Badge>
}

export function TrendBadge({ trend }: { trend: BotDecision["trend"] }) {
  if (!trend) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        trend === "UP" && "text-green-500",
        trend === "DOWN" && "text-red-500",
        trend === "UNCLEAR" && "text-muted-foreground"
      )}
    >
      {trend === "UP" ? "Naik" : trend === "DOWN" ? "Turun" : "Tidak jelas"}
    </span>
  )
}

export function ComplianceList({ json }: { json: string | null }) {
  if (!json) return <span className="text-xs text-muted-foreground">—</span>
  const check = JSON.parse(json) as ComplianceCheck
  return (
    <ul className="flex flex-col gap-0.5">
      {(
        Object.keys(COMPLIANCE_LABELS) as (keyof typeof COMPLIANCE_LABELS)[]
      ).map((key) => (
        <li
          key={key}
          className={cn(
            "flex items-center gap-1 text-[11px]",
            !check[key] && "text-destructive"
          )}
        >
          {check[key] ? (
            <Check className="size-3 text-green-500" />
          ) : (
            <X className="size-3" />
          )}
          {COMPLIANCE_LABELS[key]}
        </li>
      ))}
    </ul>
  )
}
