export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  indicator: string;
  type: "Bullish" | "Bearish" | "Neutral";
  message: string;
}

export interface MarketScore {
  bullishScore: number;
  bearishScore: number;
  confidenceLevel: "Low" | "Medium" | "High";
  trendStrength: "Weak" | "Moderate" | "Strong";
  dominance: "Buyer" | "Seller" | "Neutral";
  signals: Signal[];
}

export interface ProbabilityResult {
  trendContinuation: number;
  reversalRisk: number;
  breakoutProbability: number;
  fakeBreakoutRisk: number;
  confidence: number;
}
