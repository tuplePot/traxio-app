import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { addToWatchlist, removeFromWatchlist } from "@/server/watchlist"
import { moveSymbolToGroup } from "@/server/watchlist-groups"
import type { TVSymbol } from "@/server/symbol-search"
import type { WatchlistItem } from "@/db/schema/watchlist"

export function useWatchlistItems(initialItems: WatchlistItem[]) {
  const queryClient = useQueryClient()

  const [items, setItems] = useState<WatchlistItem[]>(initialItems)
  const [activeItemId, setActiveItemId] = useState<string | null>(
    initialItems[0]?.id ?? null
  )

  async function addSymbol(sym: TVSymbol, groupId: string | null) {
    const item = await addToWatchlist({
      data: {
        symbol: sym.symbol,
        exchange: sym.exchange,
        description: sym.description,
        symbolType: sym.type,
        groupId,
      },
    })
    setItems((prev) =>
      prev.find((i) => i.id === item.id) ? prev : [...prev, item]
    )
    setActiveItemId(item.id)
    queryClient.invalidateQueries({ queryKey: ["watchlist"] })
  }

  async function removeItem(item: WatchlistItem, visibleItems: WatchlistItem[]) {
    await removeFromWatchlist({ data: { id: item.id } })
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setActiveItemId((current) => {
      if (current !== item.id) return current
      const remaining = visibleItems.filter((i) => i.id !== item.id)
      return remaining[0]?.id ?? null
    })
    queryClient.invalidateQueries({ queryKey: ["watchlist"] })
  }

  async function moveItemToGroup(itemId: string, groupId: string | null) {
    const updated = await moveSymbolToGroup({ data: { itemId, groupId } })
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, groupId: updated.groupId } : i))
    )
    queryClient.invalidateQueries({ queryKey: ["watchlist"] })
  }

  /** Lepas referensi grup yang sudah dihapus, supaya item-nya jatuh ke "Tanpa grup". */
  function clearGroupReferences(groupId: string) {
    setItems((prev) =>
      prev.map((i) => (i.groupId === groupId ? { ...i, groupId: null } : i))
    )
  }

  return {
    items,
    activeItemId,
    setActiveItemId,
    addSymbol,
    removeItem,
    moveItemToGroup,
    clearGroupReferences,
  }
}
