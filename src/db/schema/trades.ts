import { pgTable, uuid, boolean, doublePrecision, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

export const tradesTable = pgTable("trades", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  symbol: text().notNull(),
  direction: text({ enum: ["LONG", "SHORT"] }).notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  exitPrice: doublePrecision("exit_price"),
  stopLoss: doublePrecision("stop_loss").notNull(),
  takeProfit: doublePrecision("take_profit").notNull(),
  riskReward: doublePrecision("risk_reward"),
  outcome: text({ enum: ["WIN", "LOSS", "BREAKEVEN"] }),
  emotionNote: text("emotion_note"),
  setupType: text("setup_type"),
  entryMistake: boolean("entry_mistake").notNull().default(false),
  createdAt: text("created_at").notNull().default(nowText),
  closedAt: text("closed_at"),
});

export type Trade = typeof tradesTable.$inferSelect;
export type NewTrade = typeof tradesTable.$inferInsert;
