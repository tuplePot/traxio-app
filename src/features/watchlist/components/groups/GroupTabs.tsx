import { Check, FolderPlus, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { useWatchlistGroups } from "../../hooks/useWatchlistGroups"

interface GroupTabsProps {
  activeGroupId: string | null | "all"
  onSelectGroup: (id: string | null | "all") => void
  groupsApi: ReturnType<typeof useWatchlistGroups>
}

export function GroupTabs({
  activeGroupId,
  onSelectGroup,
  groupsApi,
}: GroupTabsProps) {
  const {
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
  } = groupsApi

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelectGroup("all")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          activeGroupId === "all"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        Semua
      </button>

      {groups.map((g) => (
        <div key={g.id} className="group/gtab relative flex items-center">
          {editingGroupId === g.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                renameGroup()
              }}
              className="flex items-center gap-1"
            >
              <input
                ref={editInputRef}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={renameGroup}
                onKeyDown={(e) =>
                  e.key === "Escape" && setEditingGroupId(null)
                }
                className="w-28 rounded-md border bg-muted/40 px-2 py-1 text-xs focus:ring-1 focus:ring-primary/50 focus:outline-none"
              />
              <button type="submit" className="text-primary">
                <Check className="size-3" />
              </button>
            </form>
          ) : (
            <>
              <button
                onClick={() => onSelectGroup(g.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  activeGroupId === g.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {g.name}
              </button>
              {/* Hover-reveal on mouse; always visible on touch (no hover). */}
              <div className="ml-0.5 flex items-center gap-0.5 pointer-fine:hidden pointer-fine:group-hover/gtab:flex">
                <button
                  onClick={() => {
                    setEditingGroupId(g.id)
                    setEditingName(g.name)
                  }}
                  aria-label={`Ubah nama ${g.name}`}
                  className="rounded p-0.5 text-muted-foreground/50 transition-colors pointer-coarse:p-1.5 hover:text-foreground"
                >
                  <Pencil className="size-2.5" />
                </button>
                <button
                  onClick={() => deleteGroup(g.id)}
                  aria-label={`Hapus grup ${g.name}`}
                  className="rounded p-0.5 text-muted-foreground/50 transition-colors pointer-coarse:p-1.5 hover:text-red-500"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {showNewGroup ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createGroup().then((group) => group && onSelectGroup(group.id))
          }}
          className="flex items-center gap-1"
        >
          <input
            ref={newGroupInputRef}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onBlur={() => {
              if (!newGroupName.trim()) setShowNewGroup(false)
            }}
            onKeyDown={(e) => e.key === "Escape" && setShowNewGroup(false)}
            placeholder="Nama grup..."
            className="w-32 rounded-md border bg-muted/40 px-2 py-1 text-xs focus:ring-1 focus:ring-primary/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newGroupName.trim()}
            className="text-primary disabled:opacity-40"
          >
            <Check className="size-3" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNewGroup(true)}
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <FolderPlus className="size-3" />
          Grup baru
        </button>
      )}
    </div>
  )
}
