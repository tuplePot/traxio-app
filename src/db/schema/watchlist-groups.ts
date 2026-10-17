import { pgTable, uuid, integer, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

export const watchlistGroupsTable = pgTable("watchlist_groups", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(nowText),
})

export type WatchlistGroup = typeof watchlistGroupsTable.$inferSelect
export type NewWatchlistGroup = typeof watchlistGroupsTable.$inferInsert
