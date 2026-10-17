import { pgTable, uuid, doublePrecision, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

export const portfolioTable = pgTable("portfolio_positions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  symbol: text().notNull(),
  exchange: text().notNull().default("BINANCE"),
  quantity: doublePrecision().notNull(),
  buyPrice: doublePrecision("buy_price").notNull(),
  buyDate: text("buy_date").notNull(),
  notes: text(),
  createdAt: text("created_at").notNull().default(nowText),
})

export type PortfolioPosition = typeof portfolioTable.$inferSelect
export type NewPortfolioPosition = typeof portfolioTable.$inferInsert
