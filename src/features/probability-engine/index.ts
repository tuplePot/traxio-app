import type { OHLCV, MarketScore, ProbabilityResult } from "@/types/trading"

export function calculateProbabilities(candles: OHLCV[], score: MarketScore): ProbabilityResult {
  if (candles.length < 20) {
    return { trendContinuation: 50, reversalRisk: 50, breakoutProbability: 0, fakeBreakoutRisk: 0, confidence: 0 }
  }

  let continuation = 50
  let reversal = 50
  let breakout = 0
  let fakeBreakout = 0

  // Trend strength influence
  if (score.trendStrength === "Strong") { continuation += 20; reversal -= 20 }
  else if (score.trendStrength === "Weak") { continuation -= 20; reversal += 20 }

  // Confidence influence
  if (score.confidenceLevel === "High") { continuation += 10; reversal -= 10 }
  else if (score.confidenceLevel === "Low") { continuation -= 10; reversal += 10 }

  // Breakout detection via recent range compression
  const recentCandles = candles.slice(-10)
  const maxHigh = Math.max(...recentCandles.map((c) => c.high))
  const minLow = Math.min(...recentCandles.map((c) => c.low))
  const currentClose = candles[candles.length - 1].close
  const range = maxHigh - minLow

  if (range > 0) {
    const distToHigh = maxHigh - currentClose
    const distToLow = currentClose - minLow
    if (distToHigh / range < 0.1 || distToLow / range < 0.1) breakout = 70
    else if (distToHigh / range < 0.2 || distToLow / range < 0.2) breakout = 40
    else breakout = 15
  }

  // Fake breakout risk
  if (breakout > 50) {
    fakeBreakout = score.trendStrength === "Weak" ? 80 : score.trendStrength === "Moderate" ? 40 : 15
  } else {
    fakeBreakout = 10
  }

  continuation = Math.max(0, Math.min(100, continuation))
  reversal = Math.max(0, Math.min(100, reversal))
  const total = continuation + reversal
  continuation = Math.round((continuation / total) * 100)
  reversal = 100 - continuation

  return {
    trendContinuation: continuation,
    reversalRisk: reversal,
    breakoutProbability: breakout,
    fakeBreakoutRisk: fakeBreakout,
    confidence: score.confidenceLevel === "High" ? 0.9 : score.confidenceLevel === "Medium" ? 0.6 : 0.3,
  }
}
