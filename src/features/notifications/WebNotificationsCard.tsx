import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { AlertTriangle, BellRing, Check, Loader2 } from "lucide-react"
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
import { getPushConfig, sendPushTest } from "@/server/push"
import {
  browserNotificationsSupported,
  setWebNotificationPrefs,
  useWebNotificationPrefs,
} from "./preferences"
import { deliverNotification } from "./deliver"
import { pushSupported, subscribePush, unsubscribePush } from "./push-client"

const QUERY_KEY = ["push-config"]

type Permission = NotificationPermission | "unsupported"

function currentPermission(): Permission {
  return browserNotificationsSupported() ? Notification.permission : "unsupported"
}

/** iPhone/iPad hanya mendukung push setelah app dipasang ke Home Screen. */
function isIosBrowserTab(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia("(display-mode: standalone)").matches
  return ios && !standalone
}

export function WebNotificationsCard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prefs = useWebNotificationPrefs()
  const { data: config } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getPushConfig(),
  })
  // Dibaca setelah mount — Notification/PushManager tidak ada saat SSR.
  const [permission, setPermission] = useState<Permission>("default")
  const [canPush, setCanPush] = useState(false)
  const [iosTab, setIosTab] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setPermission(currentPermission())
    setCanPush(pushSupported())
    setIosTab(isIosBrowserTab())
  }, [])

  // Push dipakai kalau browser mendukung dan server punya kunci VAPID;
  // kalau tidak, notifikasi OS hanya dari tab yang terbuka.
  const usePush = canPush && !!config?.configured && !!config.publicKey
  const deviceActive = prefs.browser && permission === "granted"

  async function handleDeviceToggle(checked: boolean) {
    setBusy(true)
    setMessage(null)
    try {
      if (!checked) {
        if (prefs.push) await unsubscribePush()
        setWebNotificationPrefs({ browser: false, push: false })
        return
      }
      const result =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission
      setPermission(result)
      if (result !== "granted") return
      if (usePush) {
        await subscribePush(config.publicKey!)
        setWebNotificationPrefs({ browser: true, push: true })
      } else {
        setWebNotificationPrefs({ browser: true, push: false })
      }
    } catch (e) {
      setMessage(`Gagal: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    }
  }

  async function handleTest() {
    setMessage(null)
    const onOpen = () => navigate({ to: "/bot" })
    if (!(deviceActive && prefs.push)) {
      deliverNotification(
        {
          id: `local-${Date.now()}`,
          type: "BUY",
          title: "Tes notifikasi Traxio",
          body: "Kalau ini muncul, notifikasi web sudah berfungsi.",
        },
        prefs,
        { onOpen, forceBrowser: true }
      )
      return
    }
    // Tes end-to-end lewat server → push service → service worker.
    setBusy(true)
    try {
      const result = await sendPushTest()
      setMessage(
        result.sent > 0
          ? `Push terkirim ke ${result.sent} perangkat.`
          : "Gagal: tidak ada perangkat yang menerima push. Coba matikan lalu nyalakan lagi notifikasi perangkat."
      )
    } catch (e) {
      setMessage(`Gagal: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <BellRing className="size-4 text-primary" />
          Notifikasi Web
          {deviceActive ? (
            <Badge>{prefs.push ? "Push aktif" : "Browser aktif"}</Badge>
          ) : (
            <Badge variant="outline">Hanya di aplikasi</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Alert bot muncul langsung di aplikasi dan perangkat ini, selain di
          Telegram. Pengaturan ini berlaku untuk perangkat dan browser ini saja.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckboxInput
            checkboxLabel="Pop-up di aplikasi"
            description="Tampilkan notifikasi baru di pojok layar saat aplikasi terbuka"
            checked={prefs.toast}
            onCheckedChange={(checked) =>
              setWebNotificationPrefs({ toast: checked })
            }
          />
          <CheckboxInput
            checkboxLabel="Notifikasi perangkat"
            description={
              usePush
                ? "Muncul di notifikasi HP/laptop, juga saat Traxio sedang ditutup"
                : "Muncul di notifikasi perangkat saat tab Traxio tidak sedang dilihat"
            }
            checked={deviceActive}
            disabled={
              busy || permission === "unsupported" || permission === "denied"
            }
            onCheckedChange={(checked) => void handleDeviceToggle(checked)}
          />
        </div>

        {permission === "denied" && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Izin notifikasi diblokir</AlertTitle>
            <AlertDescription>
              Buka ikon gembok di address bar → izinkan Notifikasi untuk situs
              ini, lalu muat ulang halaman.
            </AlertDescription>
          </Alert>
        )}
        {iosTab ? (
          <Alert>
            <AlertTriangle />
            <AlertTitle>Pasang ke Home Screen dulu</AlertTitle>
            <AlertDescription>
              Di iPhone/iPad, notifikasi hanya bisa dari app yang terpasang:
              tombol Share di Safari → Add to Home Screen, lalu buka Traxio dari
              ikon tersebut.
            </AlertDescription>
          </Alert>
        ) : (
          permission === "unsupported" && (
            <Typography variant="muted">
              Browser ini tidak mendukung notifikasi.
            </Typography>
          )
        )}
        {config && !config.configured && (
          <Typography variant="caption">
            Push belum dikonfigurasi di server (isi VAPID_* di .env) —
            notifikasi perangkat hanya muncul selama Traxio terbuka di salah
            satu tab.
          </Typography>
        )}
        {config && config.devices > 0 && (
          <Typography variant="caption">
            {config.devices} perangkat terdaftar untuk push di akun ini.
          </Typography>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void handleTest()}
            disabled={busy || (!prefs.toast && !deviceActive)}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <BellRing className="size-3.5" />
            )}
            Kirim tes
          </Button>
          {message && (
            <Typography variant="caption" className="flex items-center gap-1.5">
              {!message.startsWith("Gagal") && <Check className="size-3" />}
              {message}
            </Typography>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
