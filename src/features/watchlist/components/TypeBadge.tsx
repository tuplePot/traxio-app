import { cn } from "@/lib/utils"
import { TYPE_LABELS } from "../constants"

const COLORS: Record<string, string> = {
  crypto: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
  stock: "bg-blue-500/10 text-blue-500",
  futures: "bg-orange-500/10 text-orange-500",
  forex: "bg-purple-500/10 text-purple-500",
  index: "bg-green-500/10 text-green-500",
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
        COLORS[type] ?? "bg-muted text-muted-foreground"
      )}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}
