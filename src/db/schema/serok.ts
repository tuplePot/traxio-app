import { pgTable, uuid, boolean, doublePrecision, text, uniqueIndex } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

/** State per (user, simbol) scanner "Serok" — dipakai untuk edge-trigger + cooldown alert. */
export const serokStateTable = pgTable(
  "serok_state",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    symbol: text().notNull(),
    inBuyZone: boolean("in_buy_zone").notNull().default(false),
    lastScore: doublePrecision("last_score"),
    lastAlertAt: text("last_alert_at"),
    updatedAt: text("updated_at")
      .notNull()
      .default(nowText),
  },
  (t) => [uniqueIndex("serok_state_user_symbol_idx").on(t.userId, t.symbol)]
)

export type SerokState = typeof serokStateTable.$inferSelect
