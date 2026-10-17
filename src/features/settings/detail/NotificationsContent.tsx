import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Send,
  Unlink,
} from "lucide-react"
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
import { Typography } from "@/components/ui/typography"
import { CheckboxInput } from "@/components/inputs/CheckboxInput"
import { EmptyState } from "@/components/empty-state"
import { LoadingScreen } from "@/components/loading-screen"
import {
  createTelegramLink,
  getTelegramStatus,
  sendTelegramTest,
  unlinkTelegram,
  updateTelegramPrefs,
} from "@/server/telegram"
import { formatDate } from "@/utils/date"
import { WebNotificationsCard } from "@/features/notifications/WebNotificationsCard"

const QUERY_KEY = ["telegram-status"]

type PrefKey =
  | "notifyBuy"
  | "notifyExit"
  | "notifyInfo"
  | "notifyError"
  | "notifyRunSummary"
  | "notifySerok"

const PREF_OPTIONS: { key: PrefKey; label: string; description: string }[] = [
  { key: "notifyBuy", label: "BUY", description: "Bot membuka paper trade baru" },
  { key: "notifyExit", label: "EXIT", description: "Posisi kena SL/TP atau ditutup manual" },
  { key: "notifyInfo", label: "Info", description: "Informasi umum dari bot" },
  { key: "notifyError", label: "Error", description: "Bot gagal berjalan" },
  {
    key: "notifyRunSummary",
    label: "Ringkasan tiap cek",
    description: "Hasil setiap cek terjadwal + jam cek berikutnya",
  },
  {
    key: "notifySerok",
    label: "Serok (sinyal beli)",
    description:
      "Sinyal \"layak dibeli\" dari scanner Serok — informasi saja, bukan auto-trade",
  },
]

export default function NotificationsContent() {
  const queryClient = useQueryClient()
  // Setelah link dibuka, cek tiap 3 detik sampai worker mencatat chat ID.
  const [waitingLink, setWaitingLink] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getTelegramStatus(),
    refetchInterval: (query) =>
      waitingLink && !query.state.data?.linked ? 3000 : false,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<unknown>, success?: string) {
    setBusy(key)
    setMessage(null)
    try {
      await action()
      if (success) setMessage(success)
    } catch (e) {
      setMessage(`Gagal: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    }
  }

  async function handleConnect() {
    // Buka tab dulu (sinkron dengan klik) supaya tidak diblokir popup blocker.
    const tab = window.open("about:blank", "_blank")
    await run("connect", async () => {
      const { url } = await createTelegramLink()
      if (tab) tab.location.href = url
      else window.location.href = url
      setWaitingLink(true)
    })
  }

  // Notifikasi web tidak bergantung pada Telegram — tetap tampil saat status
  // Telegram masih dimuat atau gagal.
  if (isLoading || error || !data) {
    return (
      <div className="space-y-6">
        <WebNotificationsCard />
        {isLoading ? (
          <LoadingScreen isLoading fullScreen={false} />
        ) : (
          <EmptyState
            title="Gagal memuat pengaturan Telegram"
            description={error instanceof Error ? error.message : undefined}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <WebNotificationsCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="size-4 text-primary" />
            Telegram
            {data.linked ? (
              <Badge>Terhubung</Badge>
            ) : (
              <Badge variant="outline">Belum terhubung</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Kirim alert bot (BUY, EXIT, error) langsung ke chat Telegram kamu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data.configured ? (
            <Alert>
              <AlertTriangle />
              <AlertTitle>Token bot belum diisi</AlertTitle>
              <AlertDescription>
                Buat bot lewat @BotFather, isi <code>TELEGRAM_BOT_TOKEN</code> di{" "}
                <code>.env</code>, lalu restart dev server dan worker.
              </AlertDescription>
            </Alert>
          ) : data.botError ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Token bot ditolak Telegram</AlertTitle>
              <AlertDescription>{data.botError}</AlertDescription>
            </Alert>
          ) : (
            <>
              {!data.workerAlive && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertTitle>Worker tidak berjalan</AlertTitle>
                  <AlertDescription>
                    Menghubungkan akun dan perintah seperti /status butuh worker.
                    Jalankan <code>bun run bot</code> di terminal terpisah.
                  </AlertDescription>
                </Alert>
              )}

              {data.linked ? (
                <div className="space-y-3">
                  <Typography variant="muted">
                    Terhubung{data.username ? ` sebagai @${data.username}` : ""}
                    {data.linkedAt &&
                      ` sejak ${formatDate(data.linkedAt, { withTime: true })}`}
                    {" "}ke @{data.botUsername}.
                  </Typography>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        run("test", () => sendTelegramTest(), "Pesan tes terkirim — cek Telegram kamu.")
                      }
                      disabled={busy !== null}
                    >
                      {busy === "test" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                      Kirim tes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setWaitingLink(false)
                        run("unlink", () => unlinkTelegram(), "Telegram diputus.")
                      }}
                      disabled={busy !== null}
                    >
                      <Unlink className="size-3.5" />
                      Putuskan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Typography variant="muted">
                    Klik tombol di bawah, Telegram akan terbuka ke @
                    {data.botUsername}. Tekan <b>Start</b> dan akun langsung
                    terhubung. Link berlaku 15 menit.
                  </Typography>
                  <Button onClick={handleConnect} disabled={busy !== null}>
                    {busy === "connect" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="size-3.5" />
                    )}
                    Hubungkan Telegram
                  </Button>
                  {waitingLink && (
                    <Typography variant="caption" className="flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" />
                      Menunggu kamu tekan Start di Telegram…
                    </Typography>
                  )}
                </div>
              )}
            </>
          )}

          {message && (
            <Typography variant="caption" className="flex items-center gap-1.5">
              {!message.startsWith("Gagal") && <Check className="size-3" />}
              {message}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Jenis alert Telegram</CardTitle>
          <CardDescription>
            Pilih notifikasi bot yang diteruskan ke Telegram. Notifikasi di
            aplikasi selalu tersimpan semua.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {PREF_OPTIONS.map((opt) => (
            <CheckboxInput
              key={opt.key}
              checkboxLabel={opt.label}
              description={opt.description}
              checked={data.prefs[opt.key]}
              disabled={busy !== null}
              onCheckedChange={(checked) =>
                run(opt.key, () => updateTelegramPrefs({ data: { [opt.key]: checked } }))
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
