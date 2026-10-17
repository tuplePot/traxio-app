import { sql } from "drizzle-orm"

/**
 * Default waktu sekarang (UTC) dalam format teks "YYYY-MM-DD HH:MM:SS" —
 * sama dengan current_timestamp di SQLite, supaya parsing di kode tetap sama.
 */
export const nowText = sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`

/** Id tetap untuk tabel satu-baris (bot_worker, telegram_state). */
export const SINGLETON_ID = "00000000-0000-0000-0000-000000000001"
