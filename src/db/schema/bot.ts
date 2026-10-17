import { pgTable, uuid, integer, boolean, doublePrecision, text, uniqueIndex } from "drizzle-orm/pg-core"
import { nowText } from "./_common"

/** Konfigurasi bot paper trading per user. Batas per tier ada di features/bot/constants.ts. */
export const botConfigTable = pgTable("bot_config", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  enabled: boolean().notNull().default(false),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  maxOrdersPerDay: integer("max_orders_per_day").notNull().default(3),
  maxOpenPositions: integer("max_open_positions").notNull().default(2),
  startingBalance: doublePrecision("starting_balance").notNull().default(10000),
  expiresAt: text("expires_at").notNull(),
  /** Jarak antar cek terjadwal (menit). Pilihan di features/bot/constants.ts. */
  runIntervalMinutes: integer("run_interval_minutes").notNull().default(240),
  /** Jadwal cek berikutnya; diisi saat config disimpan & setelah tiap run terjadwal. */
  nextRunAt: text("next_run_at"),
  updatedAt: text("updated_at")
    .notNull()
    .default(nowText),
})

export const botSymbolsTable = pgTable(
  "bot_symbols",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    symbol: text().notNull(),
    tier: text({ enum: ["CORE", "GROWTH", "SPEC"] }).notNull(),
    addedAt: text("added_at")
      .notNull()
      .default(nowText),
  },
  (t) => [uniqueIndex("bot_symbols_user_symbol_idx").on(t.userId, t.symbol)]
)

export const botRunsTable = pgTable("bot_runs", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  trigger: text({ enum: ["SCHEDULE", "MANUAL"] }).notNull(),
  status: text({ enum: ["RUNNING", "OK", "ERROR"] }).notNull(),
  summary: text(),
  error: text(),
  aiModel: text("ai_model"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
})

export const botDecisionsTable = pgTable("bot_decisions", {
  id: uuid().primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull(),
  userId: uuid("user_id").notNull(),
  symbol: text().notNull(),
  tier: text({ enum: ["CORE", "GROWTH", "SPEC"] }).notNull(),
  price: doublePrecision(),
  ema20: doublePrecision(),
  ema50: doublePrecision(),
  ema200: doublePrecision(),
  rsi: doublePrecision(),
  macdHist: doublePrecision("macd_hist"),
  atr: doublePrecision(),
  trend: text({ enum: ["UP", "DOWN", "UNCLEAR"] }),
  decision: text({
    enum: [
      "BUY",
      "NO_TRADE",
      "BLOCKED",
      "AI_REJECTED",
      "AI_WAIT",
      "AI_ERROR",
      "DATA_ERROR",
    ],
  }).notNull(),
  reason: text().notNull(),
  aiVerdict: text("ai_verdict"),
  aiConfidence: integer("ai_confidence"),
  aiReason: text("ai_reason"),
  /** JSON ComplianceCheck — hanya diisi kalau ada rencana order. */
  compliance: text(),
  createdAt: text("created_at").notNull(),
})

export const paperPositionsTable = pgTable("paper_positions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  symbol: text().notNull(),
  tier: text({ enum: ["CORE", "GROWTH", "SPEC"] }).notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  quantity: doublePrecision().notNull(),
  notional: doublePrecision().notNull(),
  stopLoss: doublePrecision("stop_loss").notNull(),
  takeProfit: doublePrecision("take_profit").notNull(),
  status: text({ enum: ["OPEN", "CLOSED"] })
    .notNull()
    .default("OPEN"),
  exitPrice: doublePrecision("exit_price"),
  exitReason: text("exit_reason", { enum: ["STOP", "TP", "MANUAL"] }),
  pnl: doublePrecision(),
  /** Trade jurnal (tabel trades) yang dibuat untuk posisi ini. */
  tradeId: uuid("trade_id"),
  decisionId: uuid("decision_id"),
  openedAt: text("opened_at").notNull(),
  closedAt: text("closed_at"),
})

export const notificationsTable = pgTable("notifications", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text({ enum: ["BUY", "EXIT", "INFO", "ERROR", "SEROK"] }).notNull(),
  title: text().notNull(),
  body: text().notNull(),
  read: boolean().notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(nowText),
})

/** Satu baris (id = 1) yang diperbarui worker supaya UI tahu worker sedang jalan. */
export const botWorkerTable = pgTable("bot_worker", {
  id: uuid().primaryKey(),
  lastSeenAt: text("last_seen_at").notNull(),
  nextRunAt: text("next_run_at"),
})

export type BotConfig = typeof botConfigTable.$inferSelect
export type BotSymbol = typeof botSymbolsTable.$inferSelect
export type BotRun = typeof botRunsTable.$inferSelect
export type BotDecision = typeof botDecisionsTable.$inferSelect
export type NewBotDecision = typeof botDecisionsTable.$inferInsert
export type PaperPosition = typeof paperPositionsTable.$inferSelect
export type Notification = typeof notificationsTable.$inferSelect
