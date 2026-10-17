/**
 * Perintah Telegram. Dua mode masuk:
 * - Long polling getUpdates di worker (`bun run bot`) — untuk lokal, tanpa HTTPS publik.
 * - Webhook `/api/telegram/webhook` — untuk Vercel (lihat scripts/telegram-webhook.ts).
 * Telegram tidak mengizinkan keduanya sekaligus: kalau webhook terpasang, polling dilewati.
 */
import { and, eq, gt } from "drizzle-orm"
import { db, first } from "@/db"
import { SINGLETON_ID, telegramLinksTable, telegramStateTable } from "@/db/schema"
import type { TelegramLink } from "@/db/schema"
import { getAccountState, getOrCreateConfig } from "@/features/bot/engine"
import { intervalLabel, nextRunAt } from "@/features/bot/constants"
import { formatWib as wib } from "./alerts"
import {
  escapeHtml,
  sendTelegramMessage,
  telegramApi,
  TelegramError,
} from "@/lib/telegram"

const POLL_TIMEOUT_SEC = 50
const RETRY_MS = 5_000

export interface TelegramUpdate {
  update_id: number
  message?: {
    text?: string
    chat: { id: number; type: string }
    from?: { username?: string; first_name?: string }
  }
}

const HELP_TEXT = [
  "<b>Perintah Traxio Bot</b>",
  "",
  "/status — saldo paper, PnL, status bot",
  "/positions — posisi paper yang masih terbuka",
  "/stop — putuskan Telegram dari akun Traxio",
  "/help — daftar perintah",
].join("\n")

function log(message: string) {
  console.log(`[telegram ${new Date().toISOString()}] ${message}`)
}

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function price(n: number): string {
  return n >= 100 ? n.toFixed(2) : n.toPrecision(5)
}

async function getOffset(): Promise<number> {
  const row = await db
    .select()
    .from(telegramStateTable)
    .where(eq(telegramStateTable.id, SINGLETON_ID))
    .then(first)
  return row?.updateOffset ?? 0
}

async function saveOffset(updateOffset: number) {
  await db
    .insert(telegramStateTable)
    .values({ id: SINGLETON_ID, updateOffset })
    .onConflictDoUpdate({ target: telegramStateTable.id, set: { updateOffset } })
}

async function findLinkByChat(chatId: string): Promise<TelegramLink | undefined> {
  return db
    .select()
    .from(telegramLinksTable)
    .where(eq(telegramLinksTable.chatId, chatId))
    .then(first)
}

const NOT_LINKED =
  "Chat ini belum terhubung ke akun Traxio. Buka <b>Pengaturan → Notifikasi</b> di aplikasi lalu klik <b>Hubungkan Telegram</b>."

async function handleStart(chatId: string, code: string, username?: string) {
  if (!code) {
    const link = await findLinkByChat(chatId)
    await sendTelegramMessage(
      chatId,
      link ? `Sudah terhubung ✅\n\n${HELP_TEXT}` : NOT_LINKED
    )
    return
  }

  const link = await db
    .select()
    .from(telegramLinksTable)
    .where(
      and(
        eq(telegramLinksTable.linkCode, code),
        gt(telegramLinksTable.linkCodeExpiresAt, new Date().toISOString())
      )
    )
    .then(first)
  if (!link) {
    await sendTelegramMessage(
      chatId,
      "Kode tidak valid atau sudah kedaluwarsa. Buat link baru dari halaman Pengaturan."
    )
    return
  }

  const now = new Date().toISOString()
  await db
    .update(telegramLinksTable)
    .set({
      chatId,
      username: username ?? null,
      linkCode: null,
      linkCodeExpiresAt: null,
      linkedAt: now,
      updatedAt: now,
    })
    .where(eq(telegramLinksTable.id, link.id))
  log(`user ${link.userId} terhubung ke chat ${chatId}`)
  await sendTelegramMessage(
    chatId,
    `✅ <b>Terhubung ke Traxio!</b>\n\nAlert bot (BUY, EXIT, error) akan dikirim ke chat ini.\n\n${HELP_TEXT}`
  )
}

async function handleStatus(chatId: string, link: TelegramLink) {
  const config = await getOrCreateConfig(link.userId)
  const account = await getAccountState(link.userId, config)
  const expired = new Date(config.expiresAt).getTime() <= Date.now()
  const botState = !config.enabled
    ? "⏸ Nonaktif"
    : expired
      ? "⌛ Kedaluwarsa"
      : "▶️ Aktif"
  const pnl = account.realizedPnl
  const lines = [
    "<b>Status Traxio Bot</b>",
    "",
    `Bot: ${botState}`,
    `Saldo paper: <b>${usd(account.balance)}</b>`,
    `PnL terealisasi: ${pnl >= 0 ? "+" : ""}${usd(pnl)}`,
    `Tersedia: ${usd(account.available)}`,
    `Posisi terbuka: ${account.openPositions.length} / ${config.maxOpenPositions}`,
    `Order hari ini: ${account.ordersToday} / ${config.maxOrdersPerDay}`,
  ]
  if (config.enabled) {
    const next = config.nextRunAt
      ? new Date(config.nextRunAt)
      : nextRunAt(new Date(), config.runIntervalMinutes)
    lines.push(
      `Cek berikutnya: ${wib(next)} WIB (tiap ${intervalLabel(config.runIntervalMinutes)})`
    )
  }
  await sendTelegramMessage(chatId, lines.join("\n"))
}

async function handlePositions(chatId: string, link: TelegramLink) {
  const config = await getOrCreateConfig(link.userId)
  const { openPositions } = await getAccountState(link.userId, config)
  if (openPositions.length === 0) {
    await sendTelegramMessage(chatId, "Tidak ada posisi paper yang terbuka.")
    return
  }
  const blocks = openPositions.map((p) =>
    [
      `<b>${escapeHtml(p.symbol)}</b> (${p.tier})`,
      `Entry ${price(p.entryPrice)} · ${usd(p.notional)}`,
      `SL ${price(p.stopLoss)} · TP ${price(p.takeProfit)}`,
      `Dibuka ${wib(new Date(p.openedAt))} WIB`,
    ].join("\n")
  )
  await sendTelegramMessage(
    chatId,
    `<b>Posisi terbuka (${openPositions.length})</b>\n\n${blocks.join("\n\n")}`
  )
}

async function handleStop(chatId: string, link: TelegramLink) {
  await db
    .update(telegramLinksTable)
    .set({ chatId: null, username: null, linkedAt: null, updatedAt: new Date().toISOString() })
    .where(eq(telegramLinksTable.id, link.id))
  log(`user ${link.userId} memutus Telegram`)
  await sendTelegramMessage(
    chatId,
    "Telegram diputus dari akun Traxio. Alert tidak akan dikirim lagi."
  )
}

export async function handleUpdate(update: TelegramUpdate) {
  const message = update.message
  // Hanya chat pribadi — alert berisi data akun.
  if (!message?.text || message.chat.type !== "private") return
  const chatId = String(message.chat.id)
  const [rawCommand, ...args] = message.text.trim().split(/\s+/)
  const command = rawCommand.toLowerCase().split("@")[0]

  if (command === "/start") {
    await handleStart(chatId, args[0] ?? "", message.from?.username)
    return
  }

  const link = await findLinkByChat(chatId)
  if (!link) {
    await sendTelegramMessage(chatId, NOT_LINKED)
    return
  }
  switch (command) {
    case "/status":
      return handleStatus(chatId, link)
    case "/positions":
      return handlePositions(chatId, link)
    case "/stop":
      return handleStop(chatId, link)
    default:
      return sendTelegramMessage(chatId, HELP_TEXT)
  }
}

export async function registerCommands() {
  await telegramApi("setMyCommands", {
    commands: [
      { command: "status", description: "Saldo paper, PnL, status bot" },
      { command: "positions", description: "Posisi paper yang terbuka" },
      { command: "stop", description: "Putuskan Telegram dari Traxio" },
      { command: "help", description: "Daftar perintah" },
    ],
  })
}

/** Loop polling tanpa akhir. Error jaringan ditunggu lalu dicoba lagi. */
export async function startTelegramPolling(): Promise<void> {
  try {
    const info = await telegramApi<{ url: string }>("getWebhookInfo")
    if (info.url) {
      log(`Webhook aktif (${info.url}) — polling dilewati, perintah diterima lewat webhook.`)
      return
    }
  } catch (e) {
    log(`getWebhookInfo gagal: ${e instanceof Error ? e.message : e}`)
  }
  try {
    await registerCommands()
  } catch (e) {
    log(`setMyCommands gagal: ${e instanceof Error ? e.message : e}`)
  }
  let offset = await getOffset()
  log("Polling dimulai.")

  for (;;) {
    try {
      const updates = await telegramApi<TelegramUpdate[]>(
        "getUpdates",
        { offset, timeout: POLL_TIMEOUT_SEC, allowed_updates: ["message"] },
        (POLL_TIMEOUT_SEC + 10) * 1000
      )
      for (const update of updates) {
        try {
          await handleUpdate(update)
        } catch (e) {
          log(`update ${update.update_id} gagal: ${e instanceof Error ? e.message : e}`)
        }
        offset = update.update_id + 1
        await saveOffset(offset)
      }
    } catch (e) {
      const conflict = e instanceof TelegramError && e.code === 409
      log(
        conflict
          ? "Ada proses lain yang polling bot yang sama (409). Pastikan cuma satu `bun run bot`."
          : `getUpdates gagal: ${e instanceof Error ? e.message : e}`
      )
      await new Promise((r) => setTimeout(r, conflict ? 30_000 : RETRY_MS))
    }
  }
}
