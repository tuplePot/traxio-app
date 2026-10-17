/**
 * Worker penjadwal bot. Jalankan terpisah dari web server:
 *   bun run bot          → jalan terus; tiap user dicek sesuai intervalnya
 *                          (default 4 jam: 00:05, 04:05, ... UTC)
 *                          + polling perintah Telegram (kalau token diisi)
 *   bun run bot --once   → satu siklus untuk semua user aktif lalu keluar
 */
import { getEnabledUserIds, runBotForUser } from "@/features/bot/engine"
import { recordHeartbeat as heartbeat, runDueBots } from "@/features/bot/scheduler"
import { startTelegramPolling } from "@/features/telegram/poller"
import { isTelegramConfigured } from "@/lib/telegram"

const HEARTBEAT_MS = 60 * 1000
/** Seberapa sering cek jadwal jatuh tempo — cukup kecil untuk interval 1 menit. */
const TICK_MS = 15 * 1000

function log(message: string) {
  console.log(`[bot ${new Date().toISOString()}] ${message}`)
}

async function runOnce() {
  const userIds = await getEnabledUserIds()
  if (userIds.length === 0) {
    log("Tidak ada user dengan bot aktif.")
    return
  }
  for (const userId of userIds) {
    try {
      const result = await runBotForUser(userId, "SCHEDULE")
      log(`user ${userId}: ${result.skipped ?? result.summary}`)
    } catch (e) {
      log(`user ${userId}: ERROR ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

async function main() {
  if (process.argv.includes("--once")) {
    await runOnce()
    return
  }

  log("Worker mulai.")
  await heartbeat()
  setInterval(() => {
    heartbeat().catch((e) => log(`heartbeat gagal: ${e}`))
  }, HEARTBEAT_MS)

  if (isTelegramConfigured()) {
    void startTelegramPolling()
  } else {
    log("TELEGRAM_BOT_TOKEN kosong — perintah Telegram tidak aktif.")
  }

  // Tick pendek (bukan tidur sampai jadwal) supaya perubahan interval dari
  // aplikasi langsung terbaca dan tetap akurat setelah laptop sleep.
  for (;;) {
    try {
      const processed = await runDueBots(log)
      if (processed > 0) await heartbeat()
    } catch (e) {
      log(`tick gagal: ${e instanceof Error ? e.message : String(e)}`)
    }
    await new Promise((r) => setTimeout(r, TICK_MS))
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  }
)
