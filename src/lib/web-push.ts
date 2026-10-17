/**
 * Pembungkus tipis library web-push. Kunci VAPID dari env:
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:/https:).
 * Hanya dipakai di server / worker.
 */
import webpush from "web-push"
import type { PushSubscription, WebPushError } from "web-push"

export function isPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  )
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null
}

let configured = false

function ensureConfigured() {
  if (configured) return
  if (!isPushConfigured()) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT belum diisi di .env")
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  configured = true
}

/** Payload yang dibaca public/sw.js. */
export interface PushPayload {
  id?: string
  type: "BUY" | "EXIT" | "INFO" | "ERROR" | "SEROK"
  title: string
  body: string
  url?: string
  tag?: string
  /** Paksa tampil walau tab sedang fokus (tombol tes). */
  test?: boolean
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload
) {
  ensureConfigured()
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60 * 60 * 24,
    urgency: payload.type === "INFO" ? "normal" : "high",
  })
}

/** 404/410 = langganan sudah tidak berlaku (browser di-uninstall, izin dicabut, dll). */
export function isGoneError(e: unknown): boolean {
  const status = (e as Partial<WebPushError> | null)?.statusCode
  return status === 404 || status === 410
}
