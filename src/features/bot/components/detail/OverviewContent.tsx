import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, Play, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { closePaperPosition, runBotNow } from "@/server/bot"
import { formatDate } from "@/utils/date"
import { cn } from "@/lib/utils"
import {
  BOT_QUERY_KEYS,
  botOverviewQueryOptions,
  formatPrice,
  formatUsd,
} from "../../queries"
import { TierBadge } from "../BotBadges"
import { intervalLabel } from "../../constants"

export default function OverviewContent() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery(botOverviewQueryOptions())
  const [running, setRunning] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function invalidate() {
    for (const queryKey of BOT_QUERY_KEYS)
      queryClient.invalidateQueries({ queryKey })
  }

  async function handleRunNow() {
    setRunning(true)
    setMessage(null)
    try {
      const result = await runBotNow()
      setMessage(result.skipped ?? result.summary ?? "Selesai")
    } catch (e) {
      setMessage(`Gagal: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(false)
      invalidate()
    }
  }

  async function handleClose(id: string) {
    setClosingId(id)
    try {
      await closePaperPosition({ data: { id } })
    } finally {
      setClosingId(null)
      invalidate()
    }
  }

  if (isLoading) return <LoadingScreen isLoading fullScreen={false} />
  if (error || !data) {
    return (
      <EmptyState
        title="Gagal memuat data bot"
        description={error instanceof Error ? error.message : undefined}
      />
    )
  }

  const { config, account, ai, worker, runs, closedPositions } = data
  const expired = new Date(config.expiresAt).getTime() <= Date.now()
  const pnlClass = account.realizedPnl >= 0 ? "text-green-500" : "text-red-500"

  const stats = [
    { label: "SALDO PAPER", value: formatUsd(account.balance) },
    {
      label: "PNL TEREALISASI",
      value: `${account.realizedPnl >= 0 ? "+" : ""}${formatUsd(account.realizedPnl)}`,
      className: pnlClass,
    },
    {
      label: "ORDER HARI INI (UTC)",
      value: `${account.ordersToday} / ${config.maxOrdersPerDay}`,
    },
    {
      label: "POSISI TERBUKA",
      value: `${account.openPositions.length} / ${config.maxOpenPositions}`,
    },
  ]

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle />
        <AlertTitle>Mode simulasi (paper trading)</AlertTitle>
        <AlertDescription>
          Semua order di halaman ini virtual — tidak ada uang asli dan tidak
          terhubung ke exchange. Biaya dan slippage tidak dihitung.
        </AlertDescription>
      </Alert>

      {!worker.alive && config.enabled && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Worker penjadwal tidak berjalan</AlertTitle>
          <AlertDescription>
            Bot aktif, tapi pengecekan otomatis butuh proses worker.
            Jalankan <code>bun run bot</code> di terminal terpisah.
            {worker.lastSeenAt &&
              ` Terakhir terlihat ${formatDate(worker.lastSeenAt, { withTime: true })}.`}
          </AlertDescription>
        </Alert>
      )}
      {config.aiEnabled && !ai.configured && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Review AI aktif tapi API key belum diisi</AlertTitle>
          <AlertDescription>
            Isi <code>DASHSCOPE_API_KEY</code> di <code>.env</code>. Sampai itu
            diisi, keputusan hanya dari aturan strategi.
          </AlertDescription>
        </Alert>
      )}
      {expired && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Strategi kedaluwarsa</AlertTitle>
          <AlertDescription>
            Tidak ada entry baru. Posisi terbuka tetap dipantau. Perpanjang di
            tab Pengaturan.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, className }) => (
          <Card key={label}>
            <CardContent className="py-3">
              <Typography variant="caption" className="tracking-widest">
                {label}
              </Typography>
              <Typography
                as="p"
                className={cn("mt-0.5 font-mono text-lg font-bold", className)}
              >
                {value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            Status bot
            <Badge variant={config.enabled ? "default" : "secondary"}>
              {config.enabled ? "Aktif" : "Nonaktif"}
            </Badge>
            <Badge variant={worker.alive ? "outline" : "destructive"}>
              Worker {worker.alive ? "jalan" : "mati"}
            </Badge>
            <Badge variant="outline">
              AI:{" "}
              {config.aiEnabled
                ? ai.configured
                  ? ai.model
                  : "belum dikonfigurasi"
                : "nonaktif"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Cek berikutnya {formatDate(data.nextRunAt, { withTime: true })}{" "}
            (tiap {intervalLabel(config.runIntervalMinutes)}). Strategi berlaku
            sampai {formatDate(config.expiresAt, { withTime: true })}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={handleRunNow} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            Jalankan sekarang
          </Button>
          {message && <Typography variant="muted">{message}</Typography>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Posisi terbuka</CardTitle>
        </CardHeader>
        <CardContent>
          {account.openPositions.length === 0 ? (
            <Typography variant="muted">
              Tidak ada posisi terbuka — bot sedang di cash.
            </Typography>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Simbol</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-end">Entry</TableHead>
                  <TableHead className="text-end">Stop-loss</TableHead>
                  <TableHead className="text-end">Take-profit</TableHead>
                  <TableHead className="text-end">Notional</TableHead>
                  <TableHead>Dibuka</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.openPositions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold">
                      {p.symbol}
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={p.tier} />
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {formatPrice(p.entryPrice)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-red-500">
                      {formatPrice(p.stopLoss)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-green-500">
                      {formatPrice(p.takeProfit)}
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {formatUsd(p.notional)} · 1x
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(p.openedAt, {
                        withTime: true,
                        format: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={closingId === p.id}
                        onClick={() => handleClose(p.id)}
                      >
                        {closingId === p.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <X />
                        )}
                        Tutup
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Run terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <Typography variant="muted">Belum pernah jalan.</Typography>
            ) : (
              <ul className="divide-y">
                {runs.map((r) => (
                  <li key={r.id} className="flex flex-col gap-0.5 py-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          r.status === "ERROR"
                            ? "destructive"
                            : r.status === "RUNNING"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                      <Typography variant="caption">
                        {formatDate(r.startedAt, {
                          withTime: true,
                          format: "short",
                        })}{" "}
                        · {r.trigger === "SCHEDULE" ? "terjadwal" : "manual"}
                      </Typography>
                    </div>
                    <Typography variant="small" className="font-normal">
                      {r.error ?? r.summary ?? "…"}
                    </Typography>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Posisi ditutup terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {closedPositions.length === 0 ? (
              <Typography variant="muted">
                Belum ada posisi yang ditutup.
              </Typography>
            ) : (
              <ul className="divide-y">
                {closedPositions.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Typography
                        as="span"
                        className="font-mono text-sm font-semibold"
                      >
                        {p.symbol}
                      </Typography>
                      <Badge variant="outline">{p.exitReason}</Badge>
                    </div>
                    <Typography
                      as="span"
                      className={cn(
                        "font-mono text-sm",
                        (p.pnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {(p.pnl ?? 0) >= 0 ? "+" : ""}
                      {formatUsd(p.pnl ?? 0)}
                    </Typography>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
