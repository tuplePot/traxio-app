/**
 * Klien tipis Telegram Bot API (tanpa library). Token dari @BotFather di
 * env TELEGRAM_BOT_TOKEN. Hanya dipakai di server / worker.
 */

const API_BASE = "https://api.telegram.org"

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN
}

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly retryAfter?: number
  ) {
    super(message)
  }
}

interface TelegramResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
  parameters?: { retry_after?: number }
}

export async function telegramApi<T>(
  method: string,
  body: Record<string, unknown> = {},
  timeoutMs = 15_000
): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new TelegramError("TELEGRAM_BOT_TOKEN belum diisi di .env")

  const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const data = (await res.json()) as TelegramResponse<T>
  if (!data.ok) {
    throw new TelegramError(
      data.description ?? `Telegram ${method} gagal (${res.status})`,
      data.error_code,
      data.parameters?.retry_after
    )
  }
  return data.result as T
}

/** Kirim pesan HTML. Sekali retry kalau kena rate limit (429). */
export async function sendTelegramMessage(
  chatId: string,
  html: string
): Promise<void> {
  const body = {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  }
  try {
    await telegramApi("sendMessage", body)
  } catch (e) {
    if (e instanceof TelegramError && e.code === 429 && e.retryAfter) {
      await new Promise((r) => setTimeout(r, e.retryAfter! * 1000))
      await telegramApi("sendMessage", body)
      return
    }
    throw e
  }
}

let cachedUsername: string | null = null

export async function getBotUsername(): Promise<string> {
  if (cachedUsername) return cachedUsername
  const me = await telegramApi<{ username: string }>("getMe")
  cachedUsername = me.username
  return cachedUsername
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
