import { z } from "zod"
import { generateObject } from "@/lib/llm"
import type { OrderPlan, Snapshot } from "./strategy"

/**
 * AI hanya boleh MENYETUJUI, MENOLAK, atau MENUNDA setup yang sudah lolos
 * aturan strategi dan cek kepatuhan. AI tidak pernah membuat sinyal sendiri.
 */
export const aiReviewSchema = z.object({
  verdict: z.enum(["APPROVE", "REJECT", "WAIT"]),
  confidence: z.number().min(0).max(100),
  reason: z.string().min(1),
  risks: z.array(z.string()).default([]),
})

export type AiReview = z.infer<typeof aiReviewSchema>

const SYSTEM_PROMPT = [
  "Kamu adalah risk reviewer untuk bot paper trading crypto (simulasi, bukan uang asli).",
  "Bot sudah menemukan setup LONG yang lolos aturan: tren 4H naik (harga > EMA20 > EMA50 > EMA200) dan pullback ke EMA20 yang terkonfirmasi.",
  "Tugasmu HANYA menilai apakah setup ini layak dieksekusi sekarang. Kamu tidak boleh mengubah harga entry, stop-loss, ukuran posisi, atau arah.",
  "Pilihan verdict:",
  "- APPROVE: data teknikal mendukung dan tidak ada berita/risiko besar yang bertentangan.",
  "- WAIT: ada keraguan wajar (mis. RSI mendekati jenuh beli, momentum lemah, berita besar yang belum jelas dampaknya).",
  "- REJECT: ada alasan kuat untuk tidak masuk (mis. berita sangat negatif: hack, delisting, gugatan regulator).",
  "Jangan mengarang data atau berita yang tidak diberikan. Kalau berita kosong, nilai dari data teknikal saja.",
  "Tulis reason dalam bahasa Indonesia, maksimal 3 kalimat.",
  'Balas HANYA satu objek JSON: {"verdict": "APPROVE"|"REJECT"|"WAIT", "confidence": 0-100, "reason": string, "risks": string[]}',
].join("\n")

export async function reviewSetup(input: {
  plan: OrderPlan
  snapshot: Snapshot
  headlines: string[]
}): Promise<{ review: AiReview; tokensIn: number; tokensOut: number }> {
  const { plan, snapshot, headlines } = input
  const prompt = JSON.stringify(
    {
      symbol: plan.symbol,
      tier: plan.tier,
      timeframe: "4h",
      entry: plan.entryPrice,
      stopLoss: plan.stopLoss,
      takeProfit: plan.takeProfit,
      notionalUsd: plan.notional,
      indicators: {
        ema20: snapshot.ema20,
        ema50: snapshot.ema50,
        ema200: snapshot.ema200,
        rsi14: snapshot.rsi,
        macdHistogram: snapshot.macdHist,
        macdHistogramPrev: snapshot.macdHistPrev,
        atr14: snapshot.atr,
      },
      recentHeadlines: headlines,
    },
    null,
    2
  )

  const { object, usage } = await generateObject({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 800,
  })
  return { review: aiReviewSchema.parse(object), ...usage }
}
