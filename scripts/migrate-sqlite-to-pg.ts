/**
 * Salin data dari local.db (SQLite lama) ke Postgres (DATABASE_URL).
 * Semua id integer / string acak lama diganti UUID baru; foreign key
 * (user_id, group_id, run_id, trade_id, decision_id) ikut dipetakan.
 *
 * Jalankan SEKALI setelah `bunx drizzle-kit migrate`, saat database Postgres
 * masih kosong:  bun scripts/migrate-sqlite-to-pg.ts [path-ke-sqlite]
 */
import "dotenv/config"
import { randomUUID } from "node:crypto"
import { createClient } from "@libsql/client"
import { Pool } from "pg"
import { SINGLETON_ID } from "../src/db/schema/_common"

type Row = Record<string, unknown>

const sqlite = createClient({ url: `file:${process.argv[2] ?? "local.db"}` })
const pg = new Pool({ connectionString: process.env.DATABASE_URL })

/** old id → UUID baru, per tabel. */
const idMaps = new Map<string, Map<string, string>>()

function mapId(table: string, old: unknown): string | null {
  if (old === null || old === undefined) return null
  let map = idMaps.get(table)
  if (!map) idMaps.set(table, (map = new Map()))
  const key = String(old)
  let id = map.get(key)
  if (!id) map.set(key, (id = randomUUID()))
  return id
}

/** Ambil UUID dari tabel referensi; null kalau baris yang dirujuk sudah tidak ada. */
function refId(table: string, old: unknown): string | null {
  if (old === null || old === undefined) return null
  return idMaps.get(table)?.get(String(old)) ?? null
}

const seconds = (v: unknown) => (v === null || v === undefined ? null : new Date(Number(v) * 1000))
const bool = (v: unknown) => (v === null || v === undefined ? null : Boolean(Number(v)))

type Transform = (row: Row) => Row

const userId = (r: Row) => refId("user", r.user_id)

/** Urutan penting: tabel yang dirujuk harus disalin lebih dulu. */
const TABLES: Array<[string, Transform]> = [
  ["user", (r) => ({
    ...r,
    id: mapId("user", r.id),
    email_verified: bool(r.email_verified),
    created_at: seconds(r.created_at),
    updated_at: seconds(r.updated_at),
  })],
  ["account", (r) => ({
    ...r,
    id: mapId("account", r.id),
    user_id: userId(r),
    // Untuk provider "credential", account_id = id user.
    account_id: r.provider_id === "credential" ? userId(r) : r.account_id,
    access_token_expires_at: seconds(r.access_token_expires_at),
    refresh_token_expires_at: seconds(r.refresh_token_expires_at),
    created_at: seconds(r.created_at),
    updated_at: seconds(r.updated_at),
  })],
  ["session", (r) => ({
    ...r,
    id: mapId("session", r.id),
    user_id: userId(r),
    expires_at: seconds(r.expires_at),
    created_at: seconds(r.created_at),
    updated_at: seconds(r.updated_at),
  })],
  ["verification", (r) => ({
    ...r,
    id: mapId("verification", r.id),
    expires_at: seconds(r.expires_at),
    created_at: seconds(r.created_at),
    updated_at: seconds(r.updated_at),
  })],
  ["settings", (r) => ({ ...r, id: mapId("settings", r.id), user_id: userId(r) })],
  ["watchlist_groups", (r) => ({ ...r, id: mapId("watchlist_groups", r.id), user_id: userId(r) })],
  ["watchlist", (r) => ({
    ...r,
    id: mapId("watchlist", r.id),
    user_id: userId(r),
    group_id: refId("watchlist_groups", r.group_id),
  })],
  ["trades", (r) => ({
    ...r,
    id: mapId("trades", r.id),
    user_id: userId(r),
    entry_mistake: bool(r.entry_mistake),
  })],
  ["portfolio_positions", (r) => ({ ...r, id: mapId("portfolio_positions", r.id), user_id: userId(r) })],
  ["bot_config", (r) => ({
    ...r,
    id: mapId("bot_config", r.id),
    user_id: userId(r),
    enabled: bool(r.enabled),
    ai_enabled: bool(r.ai_enabled),
  })],
  ["bot_symbols", (r) => ({ ...r, id: mapId("bot_symbols", r.id), user_id: userId(r) })],
  ["bot_runs", (r) => ({ ...r, id: mapId("bot_runs", r.id), user_id: userId(r) })],
  ["bot_decisions", (r) => ({
    ...r,
    id: mapId("bot_decisions", r.id),
    user_id: userId(r),
    run_id: refId("bot_runs", r.run_id),
  })],
  ["paper_positions", (r) => ({
    ...r,
    id: mapId("paper_positions", r.id),
    user_id: userId(r),
    trade_id: refId("trades", r.trade_id),
    decision_id: refId("bot_decisions", r.decision_id),
  })],
  ["notifications", (r) => ({
    ...r,
    id: mapId("notifications", r.id),
    user_id: userId(r),
    read: bool(r.read),
  })],
  ["bot_worker", (r) => ({ ...r, id: SINGLETON_ID })],
  ["telegram_links", (r) => ({
    ...r,
    id: mapId("telegram_links", r.id),
    user_id: userId(r),
    notify_buy: bool(r.notify_buy),
    notify_exit: bool(r.notify_exit),
    notify_info: bool(r.notify_info),
    notify_error: bool(r.notify_error),
  })],
  ["telegram_state", (r) => ({ ...r, id: SINGLETON_ID })],
  ["push_subscriptions", (r) => ({ ...r, id: mapId("push_subscriptions", r.id), user_id: userId(r) })],
]

/** Kolom yang wajib ada; baris yatim (user/run sudah terhapus) dilewati. */
const REQUIRED_REFS: Record<string, string[]> = {
  bot_decisions: ["user_id", "run_id"],
}

async function main() {
  const existing = await pg.query<{ n: string }>(`select count(*) as n from "user"`)
  if (Number(existing.rows[0].n) > 0) {
    throw new Error("Tabel user di Postgres sudah berisi data — migrasi dibatalkan supaya tidak dobel.")
  }

  const client = await pg.connect()
  try {
    await client.query("begin")
    for (const [table, transform] of TABLES) {
      const { rows } = await sqlite.execute(`select * from "${table}"`)
      let inserted = 0
      for (const raw of rows) {
        const row = transform({ ...raw } as Row)
        const required = ["user_id", ...(REQUIRED_REFS[table] ?? [])].filter((c) => c in row)
        if (required.some((c) => row[c] === null)) {
          console.warn(`  lewati baris yatim di ${table}:`, raw.id)
          continue
        }
        const cols = Object.keys(row)
        await client.query(
          `insert into "${table}" (${cols.map((c) => `"${c}"`).join(", ")})
           values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
          cols.map((c) => row[c]),
        )
        inserted++
      }
      console.log(`${table}: ${inserted}/${rows.length} baris`)
    }
    await client.query("commit")
    console.log("Selesai.")
  } catch (e) {
    await client.query("rollback")
    throw e
  } finally {
    client.release()
    await pg.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
