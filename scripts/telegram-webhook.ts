/**
 * Pasang / lepas webhook Telegram untuk mode Vercel.
 *   npx tsx scripts/telegram-webhook.ts set https://traxio.vercel.app
 *   npx tsx scripts/telegram-webhook.ts info
 *   npx tsx scripts/telegram-webhook.ts delete   → kembali ke long polling (bun run bot)
 * Butuh TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET di .env
 * (secret harus sama dengan yang diisi di env Vercel).
 */
import "dotenv/config"
import { registerCommands } from "@/features/telegram/poller"
import { telegramApi } from "@/lib/telegram"

const [command, baseUrl] = process.argv.slice(2)

async function main() {
  if (command === "set") {
    if (!baseUrl) throw new Error("Contoh: set https://traxio.vercel.app")
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET belum diisi di .env")
    const url = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`
    await telegramApi("setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    })
    await registerCommands()
    console.log(`Webhook terpasang: ${url}`)
  } else if (command === "delete") {
    await telegramApi("deleteWebhook")
    console.log("Webhook dilepas — jalankan `bun run bot` untuk long polling.")
  } else if (command === "info") {
    console.log(await telegramApi("getWebhookInfo"))
  } else {
    throw new Error("Perintah: set <url> | info | delete")
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
)
