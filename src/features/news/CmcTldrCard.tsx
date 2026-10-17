import type { ReactNode } from "react"
import { Typography } from "@/components/ui/typography"
import { relativeTime } from "@/utils/date"
import type { CmcTldrItem } from "./interface"

interface CmcTldrCardProps {
  item: CmcTldrItem
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g

/** Pecah satu baris markdown `[label](url)` jadi teks + <a> tertanam. */
function renderInlineLinks(line: string, lineKey: number): ReactNode[] {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let linkIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(LINK_PATTERN)
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index))
    parts.push(
      <a
        key={`${lineKey}-${linkIndex++}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        {match[1]}
      </a>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex))

  return parts
}

export function CmcTldrCard({ item }: CmcTldrCardProps) {
  const paragraphs = item.content.split("\n\n").filter(Boolean)

  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3.5 last:border-b-0">
      <div className="flex flex-col gap-1.5">
        {paragraphs.map((p, i) => (
          <Typography
            key={i}
            size="sm"
            color={p.startsWith("📉") ? "muted" : "default"}
            className="leading-snug"
          >
            {renderInlineLinks(p, i)}
          </Typography>
        ))}
      </div>
      <Typography size="xs" color="muted" className="tracking-widest">
        {relativeTime(item.time)}
      </Typography>
    </div>
  )
}
