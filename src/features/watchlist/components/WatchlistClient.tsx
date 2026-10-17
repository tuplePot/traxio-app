import { useState } from "react"
import type { WatchlistItem } from "@/db/schema/watchlist"
import type { WatchlistGroup } from "@/db/schema/watchlist-groups"
import { useWatchlistGroups } from "../hooks/useWatchlistGroups"
import { useWatchlistItems } from "../hooks/useWatchlistItems"
import { WatchlistDetailPanel } from "./detail/WatchlistDetailPanel"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { GroupTabs } from "./groups/GroupTabs"
import { SymbolChipList } from "./symbols/SymbolChipList"

interface WatchlistClientProps {
  initialItems: WatchlistItem[]
  initialGroups: WatchlistGroup[]
}

export function WatchlistClient({
  initialItems,
  initialGroups,
}: WatchlistClientProps) {
  const [activeGroupId, setActiveGroupId] = useState<string | null | "all">(
    "all"
  )
  const [showSearch, setShowSearch] = useState(false)

  const itemsApi = useWatchlistItems(initialItems)
  const groupsApi = useWatchlistGroups({
    initialGroups,
    onGroupDeleted: (groupId) => {
      itemsApi.clearGroupReferences(groupId)
      setActiveGroupId((current) => (current === groupId ? "all" : current))
    },
  })

  const visibleItems =
    activeGroupId === "all"
      ? itemsApi.items
      : itemsApi.items.filter((i) => i.groupId === activeGroupId)
  const activeItem =
    itemsApi.items.find((i) => i.id === itemsApi.activeItemId) ?? null

  return (
    <div className="flex h-full flex-col gap-3">
      <GroupTabs
        activeGroupId={activeGroupId}
        onSelectGroup={setActiveGroupId}
        groupsApi={groupsApi}
      />

      <SymbolChipList
        items={visibleItems}
        groups={groupsApi.groups}
        activeItemId={itemsApi.activeItemId}
        activeGroupId={activeGroupId}
        showSearch={showSearch}
        onShowSearchChange={setShowSearch}
        onSelectItem={itemsApi.setActiveItemId}
        onAddSymbol={itemsApi.addSymbol}
        onRemoveItem={(item) => itemsApi.removeItem(item, visibleItems)}
        onMoveItem={itemsApi.moveItemToGroup}
      />

      {activeItem ? (
        <WatchlistDetailPanel activeItem={activeItem} />
      ) : (
        <EmptyState
          title={
            (activeGroupId !== null && activeGroupId !== "all")
              ? "Grup ini belum punya simbol."
              : "Watchlist kamu kosong."
          }
          action={
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowSearch(true)}
            >
              Tambah simbol pertama
            </Button>
          }
        />
      )}
    </div>
  )
}
