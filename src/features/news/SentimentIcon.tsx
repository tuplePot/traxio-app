import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export type Sentiment = "positive" | "negative" | "neutral"

export function SentimentIcon({ sentiment }: { sentiment?: Sentiment }) {
  if (sentiment === "positive")
    return <TrendingUp className="mt-0.5 size-3 shrink-0 text-green-500" />
  if (sentiment === "negative")
    return <TrendingDown className="mt-0.5 size-3 shrink-0 text-red-500" />
  return <Minus className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
}
