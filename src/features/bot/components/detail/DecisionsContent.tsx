import { useQuery } from "@tanstack/react-query"
import { ListChecks } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Typography } from "@/components/ui/typography"
import { EmptyState } from "@/components/empty-state"
import { LoadingScreen } from "@/components/loading-screen"
import { formatDate } from "@/utils/date"
import type { BotDecision } from "@/db/schema/bot"
import { botDecisionsQueryOptions, formatPrice } from "../../queries"
import { TIER_PRIORITY } from "../../constants"
import {
  ComplianceList,
  DecisionBadge,
  TierBadge,
  TrendBadge,
} from "../BotBadges"

/** Order dulu, lalu urut tier dan simbol supaya log mudah dibaca. */
function sortDecisions(decisions: BotDecision[]): BotDecision[] {
  return [...decisions].sort(
    (a, b) =>
      Number(b.decision === "BUY") - Number(a.decision === "BUY") ||
      TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier] ||
      a.symbol.localeCompare(b.symbol)
  )
}

export default function DecisionsContent() {
  const { data, isLoading } = useQuery(botDecisionsQueryOptions())

  if (isLoading) return <LoadingScreen isLoading fullScreen={false} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="size-5" />}
        title="Belum ada log keputusan"
        description="Jalankan bot dari tab Ringkasan atau tunggu jadwal 4 jam berikutnya."
      />
    )
  }

  return (
    <div className="space-y-6">
      {data.map(({ run, decisions }) => (
        <Card key={run.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              {formatDate(run.startedAt, { withTime: true })}
              <Badge variant="secondary">
                {run.trigger === "SCHEDULE" ? "Terjadwal" : "Manual"}
              </Badge>
              <Badge
                variant={run.status === "ERROR" ? "destructive" : "outline"}
              >
                {run.status}
              </Badge>
              {run.aiModel && (
                <Badge variant="outline">AI: {run.aiModel}</Badge>
              )}
            </CardTitle>
            <CardDescription>{run.error ?? run.summary}</CardDescription>
          </CardHeader>
          {decisions.length > 0 && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Simbol</TableHead>
                    <TableHead className="text-end">Harga</TableHead>
                    <TableHead className="text-end">EMA20 / 50 / 200</TableHead>
                    <TableHead className="text-end">RSI</TableHead>
                    <TableHead>Tren 4H</TableHead>
                    <TableHead>Keputusan</TableHead>
                    <TableHead className="min-w-72">Alasan</TableHead>
                    <TableHead>Cek kepatuhan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortDecisions(decisions).map((d) => (
                    <TableRow key={d.id} className="align-top">
                      <TableCell>
                        <TierBadge tier={d.tier} />
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {d.symbol}
                      </TableCell>
                      <TableCell className="text-end font-mono">
                        {formatPrice(d.price)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-xs">
                        {formatPrice(d.ema20)} / {formatPrice(d.ema50)} /{" "}
                        {formatPrice(d.ema200)}
                      </TableCell>
                      <TableCell className="text-end font-mono">
                        {d.rsi?.toFixed(1) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <TrendBadge trend={d.trend} />
                      </TableCell>
                      <TableCell>
                        <DecisionBadge decision={d.decision} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <Typography
                          variant="small"
                          className="leading-snug font-normal"
                        >
                          {d.reason}
                        </Typography>
                        {d.aiReason && (
                          <Typography variant="caption" className="mt-1">
                            AI ({d.aiVerdict}, {d.aiConfidence}%): {d.aiReason}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <ComplianceList json={d.compliance} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
