import type { OHLCV } from "@/types/trading"

export function calculateSMA(data: number[], period: number): number[] {
  const sma = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN)
      continue
    }
    let sum = 0
    for (let j = 0; j < period; j++) sum += data[i - j]
    sma.push(sum / period)
  }
  return sma
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  let initialSmaSum = 0
  for (let i = 0; i < period; i++) initialSmaSum += data[i] || 0
  const initialSma = initialSmaSum / period

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN)
    } else if (i === period - 1) {
      ema.push(initialSma)
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }
  return ema
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi = []
  let gains = 0
  let losses = 0

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsi.push(NaN)
      continue
    }

    const diff = data[i] - data[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff

    if (i < period) {
      rsi.push(NaN)
    } else if (i === period) {
      const avgGain = gains / period
      const avgLoss = losses / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))
    } else {
      const prevDiff = data[i - period] - data[i - period - 1]
      const oldGain = prevDiff > 0 ? prevDiff : 0
      const oldLoss = prevDiff < 0 ? -prevDiff : 0

      const avgGain = (gains - oldGain + (diff > 0 ? diff : 0)) / period
      const avgLoss = (losses - oldLoss + (diff < 0 ? -diff : 0)) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))

      gains = gains - oldGain + (diff > 0 ? diff : 0)
      losses = losses - oldLoss + (diff < 0 ? -diff : 0)
    }
  }
  return rsi
}

export function calculateMACD(
  data: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) {
  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  const macdLine = data.map((_, i) =>
    isNaN(fastEMA[i]) || isNaN(slowEMA[i]) ? NaN : fastEMA[i] - slowEMA[i],
  )

  const validMacdLine = macdLine.filter((v) => !isNaN(v))
  const signalLineValid = calculateEMA(validMacdLine, signalPeriod)
  const signalLine = [
    ...new Array(data.length - validMacdLine.length).fill(NaN),
    ...signalLineValid,
  ]

  const histogram = data.map((_, i) =>
    isNaN(macdLine[i]) || isNaN(signalLine[i]) ? NaN : macdLine[i] - signalLine[i],
  )

  return { macdLine, signalLine, histogram }
}

export function calculateATR(candles: OHLCV[], period = 14): number[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - candles[i - 1].close),
      Math.abs(c.low - candles[i - 1].close),
    )
  })

  const atr: number[] = []
  let sum = 0
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      sum += tr[i]
      atr.push(NaN)
    } else if (i === period - 1) {
      sum += tr[i]
      atr.push(sum / period)
    } else {
      atr.push((atr[i - 1] * (period - 1) + tr[i]) / period)
    }
  }
  return atr
}
