import { pgTable, uuid, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

/**
 * Langganan Web Push per perangkat/browser. Satu user bisa punya banyak
 * (laptop, HP, ...). Endpoint unik per langganan; dihapus otomatis kalau
 * push service membalas 404/410 (langganan kedaluwarsa).
 */
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  endpoint: text().notNull().unique(),
  p256dh: text().notNull(),
  auth: text().notNull(),
  userAgent: text("user_agent"),
  createdAt: text("created_at")
    .notNull()
    .default(nowText),
})

export type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect
