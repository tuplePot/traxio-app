import { useEffect, useRef, useState } from "react"
import { ChevronDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WatchlistItem } from "@/db/schema/watchlist"
import type { WatchlistGroup } from "@/db/schema/watchlist-groups"
import type { TVSymbol } from "@/server/symbol-search"
import { MoveGroupPopover } from "./MoveGroupPopover"
import { SymbolSearchDropdown } from "./SymbolSearchDropdown"

interface SymbolChipListProps {
  items: WatchlistItem[]
  groups: WatchlistGroup[]
  activeItemId: string | null
  activeGroupId: string | null | "all"
  showSearch: boolean
  onShowSearchChange: (show: boolean) => void
  onSelectItem: (id: string) => void
  onAddSymbol: (sym: TVSymbol, groupId: string | null) => Promise<void>
  onRemoveItem: (item: WatchlistItem) => Promise<void>
  onMoveItem: (itemId: string, groupId: string | null) => Promise<void>
}

export function SymbolChipList({
  items,
  groups,
  activeItemId,
  activeGroupId,
  showSearch,
  onShowSearchChange,
  onSelectItem,
  onAddSymbol,
  onRemoveItem,
  onMoveItem,
}: SymbolChipListProps) {
  const [movePopoverItemId, setMovePopoverItemId] = useState<string | null>(
    null
  )
  const addBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showSearch && movePopoverItemId === null) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (addBtnRef.current && !addBtnRef.current.contains(target))
        onShowSearchChange(false)
      setMovePopoverItemId(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSearch, movePopoverItemId, onShowSearchChange])

  async function handleSelectSymbol(sym: TVSymbol) {
    onShowSearchChange(false)
    try {
      const targetGroupId =
        (activeGroupId !== null && activeGroupId !== "all") ? activeGroupId : null
      await onAddSymbol(sym, targetGroupId)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <div key={item.id} className="relative">
          <div
            onClick={() => onSelectItem(item.id)}
            className={cn(
              "group flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors",
              activeItemId === item.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-foreground/40"
            )}
          >
            <div className="flex flex-col leading-none">
              <span
                className={cn(
                  "font-mono text-xs font-semibold",
                  activeItemId === item.id
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                {item.symbol}
              </span>
              <span className="text-[9px] tracking-wider text-muted-foreground">
                {item.exchange}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMovePopoverItemId(
                  movePopoverItemId === item.id ? null : item.id
                )
              }}
              className="text-muted-foreground/40 transition-colors pointer-coarse:p-1 hover:text-muted-foreground"
              title="Pindah grup"
            >
              <ChevronDown className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveItem(item)
              }}
              className="-mr-0.5 text-muted-foreground/40 transition-colors pointer-coarse:p-1 hover:text-red-500"
            >
              <X className="size-3" />
            </button>
          </div>

          {movePopoverItemId === item.id && (
            <MoveGroupPopover
              groups={groups}
              currentGroupId={item.groupId ?? null}
              onMove={(gId) => onMoveItem(item.id, gId)}
              onClose={() => setMovePopoverItemId(null)}
            />
          )}
        </div>
      ))}

      {/* Not positioned on mobile so the search dropdown anchors to the full-width list. */}
      <div ref={addBtnRef} className="sm:relative">
        <button
          onClick={() => onShowSearchChange(!showSearch)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
            showSearch
              ? "border-primary text-primary"
              : "border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          )}
        >
          <Plus className="size-3" />
          {(activeGroupId !== null && activeGroupId !== "all")
            ? `Tambah ke ${groups.find((g) => g.id === activeGroupId)?.name ?? "grup"}`
            : "Add Symbol"}
        </button>
        {showSearch && (
          <SymbolSearchDropdown
            onSelect={handleSelectSymbol}
            onClose={() => onShowSearchChange(false)}
          />
        )}
      </div>
    </div>
  )
}
