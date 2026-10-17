import { timingSafeEqual } from "node:crypto"

/** Bandingkan secret tanpa bocor lewat timing. Secret kosong selalu ditolak. */
export function secretMatches(given: string | null, expected: string | undefined) {
  if (!given || !expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
