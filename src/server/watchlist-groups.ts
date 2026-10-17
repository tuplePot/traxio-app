import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import { db } from "@/db"
import { watchlistGroupsTable, watchlistTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq, and } from "drizzle-orm"
import type { WatchlistGroup } from "@/db/schema/watchlist-groups"
import type { WatchlistItem } from "@/db/schema/watchlist"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export interface WatchlistData {
  groups: WatchlistGroup[]
  items: WatchlistItem[]
}

export const getWatchlistData = createServerFn().handler(async (): Promise<WatchlistData> => {
  const userId = await requireUserId()
  const [groups, items] = await Promise.all([
    db
      .select()
      .from(watchlistGroupsTable)
      .where(eq(watchlistGroupsTable.userId, userId))
      .orderBy(watchlistGroupsTable.sortOrder, watchlistGroupsTable.createdAt),
    db
      .select()
      .from(watchlistTable)
      .where(eq(watchlistTable.userId, userId))
      .orderBy(watchlistTable.addedAt),
  ])
  return { groups, items }
})

export const createWatchlistGroup = createServerFn()
  .validator(z.object({ name: z.string().min(1).max(50) }))
  .handler(async ({ data }): Promise<WatchlistGroup> => {
    const userId = await requireUserId()
    const existing = await db
      .select()
      .from(watchlistGroupsTable)
      .where(eq(watchlistGroupsTable.userId, userId))
    const sortOrder = existing.length
    const rows = await db
      .insert(watchlistGroupsTable)
      .values({ userId, name: data.name.trim(), sortOrder })
      .returning()
    return rows[0]!
  })

export const renameWatchlistGroup = createServerFn()
  .validator(z.object({ id: z.uuid(), name: z.string().min(1).max(50) }))
  .handler(async ({ data }): Promise<WatchlistGroup> => {
    const userId = await requireUserId()
    const rows = await db
      .update(watchlistGroupsTable)
      .set({ name: data.name.trim() })
      .where(and(eq(watchlistGroupsTable.id, data.id), eq(watchlistGroupsTable.userId, userId)))
      .returning()
    return rows[0]!
  })

export const deleteWatchlistGroup = createServerFn()
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    // Move all symbols in this group to ungrouped
    await db
      .update(watchlistTable)
      .set({ groupId: null })
      .where(
        and(
          eq(watchlistTable.userId, userId),
          eq(watchlistTable.groupId, data.id),
        ),
      )
    await db
      .delete(watchlistGroupsTable)
      .where(and(eq(watchlistGroupsTable.id, data.id), eq(watchlistGroupsTable.userId, userId)))
    return { success: true }
  })

export const moveSymbolToGroup = createServerFn()
  .validator(z.object({ itemId: z.uuid(), groupId: z.uuid().nullable() }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const rows = await db
      .update(watchlistTable)
      .set({ groupId: data.groupId })
      .where(and(eq(watchlistTable.id, data.itemId), eq(watchlistTable.userId, userId)))
      .returning()
    return rows[0]!
  })
