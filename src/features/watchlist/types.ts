import type { INTERVALS } from "./constants"

export type Interval = (typeof INTERVALS)[number]
export type ActiveTab = "chart" | "news" | "analysis"
