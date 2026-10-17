import type { OHLCV, MarketScore, Signal } from "@/types/trading"
import { calculateRSI, calculateMACD, calculateEMA } from "@/utils/indicators"

export function generateMarketScore(candles: OHLCV[]): MarketScore {
  if (candles.length < 50) {
    return {
      bullishScore: 0,
      bearishScore: 0,
      confidenceLevel: "Low",
      trendStrength: "Weak",
      dominance: "Neutral",
      signals: [{ indicator: "System", type: "Neutral", message: "Not enough data" }],
    }
  }

  const closes = candles.map((c) => c.close)
  const currentClose = closes[closes.length - 1]

  const rsi = calculateRSI(closes, 14)
  const currentRsi = rsi[rsi.length - 1]

  const { macdLine, signalLine, histogram } = calculateMACD(closes)
  const currentMacd = macdLine[macdLine.length - 1]
  const currentSignal = signalLine[signalLine.length - 1]
  const currentHist = histogram[histogram.length - 1]

  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const ema50 = calculateEMA(closes, 50)
  const currentEma9 = ema9[ema9.length - 1]
  const currentEma21 = ema21[ema21.length - 1]
  const currentEma50 = ema50[ema50.length - 1]

  let bullishPoints = 0
  let bearishPoints = 0
  let totalWeight = 0
  const signals: Signal[] = []

  const addScore = (bull: number, bear: number, weight: number) => {
    bullishPoints += bull * weight
    bearishPoints += bear * weight
    totalWeight += weight
  }

  // RSI (weight: 20)
  if (currentRsi < 30) {
    addScore(80, 20, 20)
    signals.push({ indicator: "RSI", type: "Bullish", message: `Oversold (${currentRsi.toFixed(1)})` })
  } else if (currentRsi > 70) {
    addScore(20, 80, 20)
    signals.push({ indicator: "RSI", type: "Bearish", message: `Overbought (${currentRsi.toFixed(1)})` })
  } else if (currentRsi > 50) {
    addScore(60, 40, 20)
    signals.push({ indicator: "RSI", type: "Bullish", message: `Bullish Territory (${currentRsi.toFixed(1)})` })
  } else {
    addScore(40, 60, 20)
    signals.push({ indicator: "RSI", type: "Bearish", message: `Bearish Territory (${currentRsi.toFixed(1)})` })
  }

  // MACD (weight: 30)
  const prevHist = histogram[histogram.length - 2]
  if (currentHist > 0 && currentHist > prevHist) {
    addScore(90, 10, 30)
    signals.push({ indicator: "MACD", type: "Bullish", message: "Histogram growing positive" })
  } else if (currentHist < 0 && currentHist < prevHist) {
    addScore(10, 90, 30)
    signals.push({ indicator: "MACD", type: "Bearish", message: "Histogram growing negative" })
  } else if (currentMacd > currentSignal) {
    addScore(70, 30, 30)
    signals.push({ indicator: "MACD", type: "Bullish", message: "MACD > Signal" })
  } else {
    addScore(30, 70, 30)
    signals.push({ indicator: "MACD", type: "Bearish", message: "MACD < Signal" })
  }

  // EMA (weight: 30)
  if (currentClose > currentEma9 && currentEma9 > currentEma21 && currentEma21 > currentEma50) {
    addScore(100, 0, 30)
    signals.push({ indicator: "EMA", type: "Bullish", message: "Perfect Bullish Alignment (Price > 9 > 21 > 50)" })
  } else if (currentClose < currentEma9 && currentEma9 < currentEma21 && currentEma21 < currentEma50) {
    addScore(0, 100, 30)
    signals.push({ indicator: "EMA", type: "Bearish", message: "Perfect Bearish Alignment (Price < 9 < 21 < 50)" })
  } else if (currentClose > currentEma21) {
    addScore(60, 40, 30)
    signals.push({ indicator: "EMA", type: "Neutral", message: "Price above EMA21 but mixed alignment" })
  } else {
    addScore(40, 60, 30)
    signals.push({ indicator: "EMA", type: "Neutral", message: "Price below EMA21 but mixed alignment" })
  }

  // Volume (weight: 20)
  const volumes = candles.map((c) => c.volume)
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const currentVol = volumes[volumes.length - 1]
  const isBullishCandle = currentClose >= candles[candles.length - 1].open

  if (currentVol > avgVolume * 1.5) {
    if (isBullishCandle) {
      addScore(90, 10, 20)
      signals.push({ indicator: "Volume", type: "Bullish", message: "High volume bullish candle" })
    } else {
      addScore(10, 90, 20)
      signals.push({ indicator: "Volume", type: "Bearish", message: "High volume bearish candle" })
    }
  } else {
    addScore(50, 50, 20)
    signals.push({ indicator: "Volume", type: "Neutral", message: "Average volume" })
  }

  const finalBullish = Math.round(bullishPoints / totalWeight)
  const finalBearish = Math.round(bearishPoints / totalWeight)

  const dominance: MarketScore["dominance"] =
    finalBullish > 65 ? "Buyer" : finalBearish > 65 ? "Seller" : "Neutral"

  const spread = Math.abs(finalBullish - finalBearish)
  const confidenceLevel: MarketScore["confidenceLevel"] =
    spread > 50 ? "High" : spread < 20 ? "Low" : "Medium"

  const hist5ago = histogram[histogram.length - 5]
  const trendStrength: MarketScore["trendStrength"] =
    Math.abs(currentHist) > Math.abs(hist5ago) * 2
      ? "Strong"
      : Math.abs(currentHist) < Math.abs(hist5ago) * 0.5
        ? "Weak"
        : "Moderate"

  return { bullishScore: finalBullish, bearishScore: finalBearish, confidenceLevel, trendStrength, dominance, signals }
}
