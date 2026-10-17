import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { randomBytes } from "node:crypto"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db, first, one } from "@/db"
import { botWorkerTable, SINGLETON_ID, telegramLinksTable } from "@/db/schema"
import { auth } from "@/lib/auth"
import {
  getBotUsername,
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/telegram"
import { formatAlert } from "@/features/telegram/alerts"

async function requireUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user.id) throw new Error("Unauthorized")
  return session.user.id
}

const LINK_CODE_TTL_MS = 15 * 60 * 1000
/** Sama dengan getBotOverview: worker hidup kalau heartbeat < 3 menit. */
const WORKER_ALIVE_MS = 3 * 60 * 1000

async function getOrCreateLink(userId: string) {
  const existing = await db
    .select()
    .from(telegramLinksTable)
    .where(eq(telegramLinksTable.userId, userId))
    .then(first)
  if (existing) return existing
  return db.insert(telegramLinksTable).values({ userId }).returning().then(one)
}

export const getTelegramStatus = createServerFn().handler(async () => {
  const userId = await requireUserId()
  const configured = isTelegramConfigured()
  let botUsername: string | null = null
  let botError: string | null = null
  if (configured) {
    try {
      botUsername = await getBotUsername()
    } catch (e) {
      botError = e instanceof Error ? e.message : String(e)
    }
  }
  const link = await getOrCreateLink(userId)
  const worker = await db
    .select()
    .from(botWorkerTable)
    .where(eq(botWorkerTable.id, SINGLETON_ID))
    .then(first)

  return {
    configured,
    botUsername,
    botError,
    linked: !!link.chatId,
    username: link.username,
    linkedAt: link.linkedAt,
    prefs: {
      notifyBuy: link.notifyBuy,
      notifyExit: link.notifyExit,
      notifyInfo: link.notifyInfo,
      notifyError: link.notifyError,
      notifyRunSummary: link.notifyRunSummary,
      notifySerok: link.notifySerok,
    },
    workerAlive:
      !!worker &&
      Date.now() - new Date(worker.lastSeenAt).getTime() < WORKER_ALIVE_MS,
  }
})

/** Buat kode sekali pakai lalu kembalikan deep link t.me/<bot>?start=<kode>. */
export const createTelegramLink = createServerFn().handler(async () => {
  const userId = await requireUserId()
  const botUsername = await getBotUsername()
  await getOrCreateLink(userId)
  const code = randomBytes(12).toString("base64url")
  await db
    .update(telegramLinksTable)
    .set({
      linkCode: code,
      linkCodeExpiresAt: new Date(Date.now() + LINK_CODE_TTL_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(telegramLinksTable.userId, userId))
  return { url: `https://t.me/${botUsername}?start=${code}` }
})

export const updateTelegramPrefs = createServerFn()
  .validator(
    z.object({
      notifyBuy: z.boolean().optional(),
      notifyExit: z.boolean().optional(),
      notifyInfo: z.boolean().optional(),
      notifyError: z.boolean().optional(),
      notifyRunSummary: z.boolean().optional(),
      notifySerok: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    await getOrCreateLink(userId)
    await db
      .update(telegramLinksTable)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(telegramLinksTable.userId, userId))
  })

export const sendTelegramTest = createServerFn().handler(async () => {
  const userId = await requireUserId()
  const link = await getOrCreateLink(userId)
  if (!link.chatId) throw new Error("Telegram belum terhubung")
  await sendTelegramMessage(
    link.chatId,
    formatAlert(
      "INFO",
      "Tes notifikasi Traxio",
      "Kalau pesan ini sampai, alert bot sudah siap dikirim ke Telegram kamu."
    )
  )
})

export const unlinkTelegram = createServerFn().handler(async () => {
  const userId = await requireUserId()
  await db
    .update(telegramLinksTable)
    .set({
      chatId: null,
      username: null,
      linkedAt: null,
      linkCode: null,
      linkCodeExpiresAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(telegramLinksTable.userId, userId))
})
