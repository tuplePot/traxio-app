import { pgTable, uuid, integer, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

export const settingsTable = pgTable("settings", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  currency: text().notNull().default("IDR"),
  customUsdToIdr: integer("custom_usd_to_idr").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(nowText),
})

export type AppSettings = typeof settingsTable.$inferSelect
