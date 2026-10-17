import { pgTable, uuid, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

export const watchlistTable = pgTable("watchlist", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  groupId: uuid("group_id"),
  symbol: text().notNull(),
  exchange: text().notNull().default("BINANCE"),
  description: text(),
  symbolType: text("symbol_type"),
  addedAt: text("added_at").notNull().default(nowText),
});

export type WatchlistItem = typeof watchlistTable.$inferSelect;
export type NewWatchlistItem = typeof watchlistTable.$inferInsert;
