import { createFileRoute } from "@tanstack/react-router"
import { recordHeartbeat, runDueBots } from "@/features/bot/scheduler"
import { secretMatches } from "@/lib/secret"

/**
 * Pengganti loop worker di serverless (Vercel). Panggil tiap 1 menit dari
 * cron eksternal (cron-job.org) dengan header `Authorization: Bearer <CRON_SECRET>`.
 * Hanya user yang jadwalnya sudah jatuh tempo yang dijalankan.
 */
export const Route = createFileRoute("/api/cron/bot")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const token = request.headers
          .get("authorization")
          ?.replace(/^Bearer\s+/i, "")
        if (!secretMatches(token ?? null, process.env.CRON_SECRET))
          return new Response("Unauthorized", { status: 401 })

        const logs: string[] = []
        const processed = await runDueBots((m) => {
          logs.push(m)
          console.log(`[cron] ${m}`)
        })
        await recordHeartbeat()
        return Response.json({ processed, logs })
      },
    },
  },
})
