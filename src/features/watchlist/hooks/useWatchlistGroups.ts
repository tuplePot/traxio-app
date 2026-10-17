import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  createWatchlistGroup,
  renameWatchlistGroup,
  deleteWatchlistGroup,
} from "@/server/watchlist-groups"
import type { WatchlistGroup } from "@/db/schema/watchlist-groups"

interface UseWatchlistGroupsOptions {
  initialGroups: WatchlistGroup[]
  /** Dipanggil setelah grup berhasil dihapus, biar caller bisa bersihkan referensi di items/activeGroupId. */
  onGroupDeleted: (groupId: string) => void
}

export function useWatchlistGroups({
  initialGroups,
  onGroupDeleted,
}: UseWatchlistGroupsOptions) {
  const queryClient = useQueryClient()

  const [groups, setGroups] = useState<WatchlistGroup[]>(initialGroups)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [showNewGroup, setShowNewGroup] = useState(false)

  const editInputRef = useRef<HTMLInputElement>(null)
  const newGroupInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingGroupId !== null) editInputRef.current?.focus()
  }, [editingGroupId])

  useEffect(() => {
    if (showNewGroup) newGroupInputRef.current?.focus()
  }, [showNewGroup])

  async function createGroup() {
    const name = newGroupName.trim()
    if (!name) return null
    const group = await createWatchlistGroup({ data: { name } })
    setGroups((prev) => [...prev, group])
    setNewGroupName("")
    setShowNewGroup(false)
    queryClient.invalidateQueries({ queryKey: ["watchlist"] })
    return group
  }

  async function renameGroup() {
    if (editingGroupId === null) return
    const name = editingName.trim()
    if (!name) {
      setEditingGroupId(null)
      return
    }
    const updated = await renameWatchlistGroup({
      data: { id: editingGroupId, name },
    })
    setGroups((prev) =>
      prev.map((g) => (g.id === editingGroupId ? updated : g))
    )
    setEditingGroupId(null)
    queryClient.invalidateQueries({ queryKey: ["watchlist"] })
  }

  async function deleteGroup(groupId: string) {
    await deleteWatchlistGroup({ data: { id: groupId } })
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    onGroupDeleted(groupId)
    queryClient.invalidateQueries({ queryKey: ["watchlist"] })
  }

  return {
    groups,
    editingGroupId,
    editingName,
    newGroupName,
    showNewGroup,
    editInputRef,
    newGroupInputRef,
    setEditingGroupId,
    setEditingName,
    setNewGroupName,
    setShowNewGroup,
    createGroup,
    renameGroup,
    deleteGroup,
  }
}
