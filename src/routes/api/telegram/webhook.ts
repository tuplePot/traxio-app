import { createFileRoute } from "@tanstack/react-router"
import { handleUpdate } from "@/features/telegram/poller"
import type { TelegramUpdate } from "@/features/telegram/poller"
import { secretMatches } from "@/lib/secret"

/**
 * Webhook Telegram (mode Vercel). Didaftarkan lewat
 * `npx tsx scripts/telegram-webhook.ts set https://<domain>`; Telegram
 * mengirim header secret yang sama dengan TELEGRAM_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = request.headers.get("x-telegram-bot-api-secret-token")
        if (!secretMatches(secret, process.env.TELEGRAM_WEBHOOK_SECRET))
          return new Response("Unauthorized", { status: 401 })
        try {
          await handleUpdate((await request.json()) as TelegramUpdate)
        } catch (e) {
          // Tetap 200 supaya Telegram tidak mengirim ulang update yang sama terus-menerus.
          console.error("[telegram webhook]", e instanceof Error ? e.message : e)
        }
        return new Response("ok")
      },
    },
  },
})
