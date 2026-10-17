import { eq } from "drizzle-orm"
import { db, first } from "@/db"
import { telegramLinksTable } from "@/db/schema"
import type { TelegramLink } from "@/db/schema"
import {
  escapeHtml,
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/telegram"
import { intervalLabel } from "@/features/bot/constants"

export type AlertType = "BUY" | "EXIT" | "INFO" | "ERROR" | "SEROK"

const ALERT_ICON: Record<AlertType, string> = {
  BUY: "🟢",
  EXIT: "🔴",
  INFO: "ℹ️",
  ERROR: "⚠️",
  SEROK: "📡",
}

function wantsAlert(link: TelegramLink, type: AlertType): boolean {
  switch (type) {
    case "BUY":
      return link.notifyBuy
    case "EXIT":
      return link.notifyExit
    case "INFO":
      return link.notifyInfo
    case "ERROR":
      return link.notifyError
    case "SEROK":
      return link.notifySerok
  }
}

export function formatWib(date: Date): string {
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

async function findLinkedChat(userId: string) {
  const link = await db
    .select()
    .from(telegramLinksTable)
    .where(eq(telegramLinksTable.userId, userId))
    .then(first)
  return link?.chatId ? link : undefined
}

export function formatAlert(type: AlertType, title: string, body: string) {
  return `${ALERT_ICON[type]} <b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`
}

/**
 * Teruskan notifikasi ke Telegram user (kalau sudah terhubung dan tipe ini
 * diaktifkan). Tidak pernah melempar error — alert gagal tidak boleh
 * menghentikan bot.
 */
export async function sendTelegramAlert(
  userId: string,
  type: AlertType,
  title: string,
  body: string
): Promise<void> {
  if (!isTelegramConfigured()) return
  try {
    const link = await findLinkedChat(userId)
    if (!link?.chatId || !wantsAlert(link, type)) return
    await sendTelegramMessage(link.chatId, formatAlert(type, title, body))
  } catch (e) {
    console.error(
      `[telegram] gagal kirim alert ke user ${userId}:`,
      e instanceof Error ? e.message : e
    )
  }
}

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface RunSummary {
  ok: boolean
  /** Ringkasan run (atau pesan error). */
  status: string
  /** Breakdown per-simbol (near signal, diblokir, serok, dst) — khusus Telegram. */
  detail?: string
  next: Date
  intervalMinutes: number
  account: {
    balance: number
    openPositions: number
    maxOpenPositions: number
  } | null
}

/**
 * Pesan setelah tiap cek terjadwal: hasilnya + kapan cek berikutnya, supaya
 * user tahu bot masih hidup walau tidak ada sinyal. Tidak pernah melempar error.
 */
export async function sendRunSummary(
  userId: string,
  summary: RunSummary
): Promise<void> {
  if (!isTelegramConfigured()) return
  try {
    const link = await findLinkedChat(userId)
    if (!link?.chatId || !link.notifyRunSummary) return
    const lines = [
      summary.ok
        ? `🤖 <b>Cek terjadwal selesai</b> · ${formatWib(new Date())} WIB`
        : `⚠️ <b>Cek terjadwal gagal</b> · ${formatWib(new Date())} WIB`,
      "",
      escapeHtml(summary.status),
    ]
    if (summary.detail) lines.push("", escapeHtml(summary.detail))
    if (summary.account)
      lines.push(
        `Saldo paper ${usd(summary.account.balance)} · posisi ${summary.account.openPositions}/${summary.account.maxOpenPositions}`
      )
    lines.push(
      "",
      `⏭ Cek berikutnya: <b>${formatWib(summary.next)} WIB</b> (tiap ${intervalLabel(summary.intervalMinutes)})`
    )
    await sendTelegramMessage(link.chatId, lines.join("\n"))
  } catch (e) {
    console.error(
      `[telegram] gagal kirim ringkasan ke user ${userId}:`,
      e instanceof Error ? e.message : e
    )
  }
}

/** Konfirmasi saat bot diaktifkan / jadwal diubah dari aplikasi. */
export async function sendScheduleNotice(
  userId: string,
  enabled: boolean,
  next: Date,
  intervalMinutes: number
): Promise<void> {
  if (!isTelegramConfigured()) return
  try {
    const link = await findLinkedChat(userId)
    if (!link?.chatId || !link.notifyRunSummary) return
    await sendTelegramMessage(
      link.chatId,
      enabled
        ? `▶️ <b>Bot aktif</b> — cek tiap ${intervalLabel(intervalMinutes)}.\n\n⏭ Cek pertama: <b>${formatWib(next)} WIB</b>`
        : "⏸ <b>Bot dinonaktifkan</b> — tidak ada cek terjadwal sampai diaktifkan lagi."
    )
  } catch (e) {
    console.error(
      `[telegram] gagal kirim info jadwal ke user ${userId}:`,
      e instanceof Error ? e.message : e
    )
  }
}
