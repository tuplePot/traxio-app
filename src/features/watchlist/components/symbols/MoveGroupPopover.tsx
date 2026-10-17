import { Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WatchlistGroup } from "@/db/schema/watchlist-groups"
import { Typography } from "@/components/ui/typography"

interface MoveGroupPopoverProps {
  groups: WatchlistGroup[]
  currentGroupId: string | null
  onMove: (groupId: string | null) => void
  onClose: () => void
}

export function MoveGroupPopover({
  groups,
  currentGroupId,
  onMove,
  onClose,
}: MoveGroupPopoverProps) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-44">
      <Card className="overflow-hidden py-1 shadow-lg">
        <div className="px-2 pt-0.5 pb-1">
          <Typography className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
            Pindah ke grup
          </Typography>
        </div>
        <button
          onClick={() => {
            onMove(null)
            onClose()
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60",
            currentGroupId === null && "font-medium text-primary"
          )}
        >
          {currentGroupId === null && <Check className="size-3" />}
          <Typography className={currentGroupId === null ? "" : "ml-5"}>
            Tanpa grup
          </Typography>
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              onMove(g.id)
              onClose()
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60",
              currentGroupId === g.id && "font-medium text-primary"
            )}
          >
            {currentGroupId === g.id && <Check className="size-3" />}
            <Typography className={currentGroupId === g.id ? "" : "ml-5"}>
              {g.name}
            </Typography>
          </button>
        ))}
      </Card>
    </div>
  )
}
