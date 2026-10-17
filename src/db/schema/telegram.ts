import { pgTable, uuid, integer, boolean, text } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

/** Sambungan akun ke chat Telegram + preferensi alert per user. */
export const telegramLinksTable = pgTable("telegram_links", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  /** Diisi worker setelah user kirim /start <kode> ke bot. */
  chatId: text("chat_id"),
  username: text(),
  /** Kode sekali pakai untuk deep link t.me/<bot>?start=<kode>. */
  linkCode: text("link_code").unique(),
  linkCodeExpiresAt: text("link_code_expires_at"),
  notifyBuy: boolean("notify_buy").notNull().default(true),
  notifyExit: boolean("notify_exit").notNull().default(true),
  notifyInfo: boolean("notify_info").notNull().default(true),
  notifyError: boolean("notify_error").notNull().default(true),
  /** Ringkasan tiap cek terjadwal + jam cek berikutnya. */
  notifyRunSummary: boolean("notify_run_summary").notNull().default(true),
  /** Sinyal "layak dibeli" dari scanner Serok — info saja, bukan auto-trade. */
  notifySerok: boolean("notify_serok").notNull().default(true),
  linkedAt: text("linked_at"),
  updatedAt: text("updated_at")
    .notNull()
    .default(nowText),
})

/** Satu baris (id = 1): offset getUpdates supaya pesan tidak diproses ulang setelah worker restart. */
export const telegramStateTable = pgTable("telegram_state", {
  id: uuid().primaryKey(),
  updateOffset: integer("update_offset").notNull().default(0),
})

export type TelegramLink = typeof telegramLinksTable.$inferSelect
