import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettings } from "@/lib/settings-context"
import { formatNumber } from "@/utils/currency"
import { Check, RefreshCw, DollarSign, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CurrencyDisplayContent() {
  const { settings, update } = useSettings()
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [customRate, setCustomRate] = useState(
    settings.customUsdToIdr > 0 ? String(settings.customUsdToIdr) : "",
  )
  const [saved, setSaved] = useState(false)

  async function handleSaveCurrency(currency: "USD" | "IDR") {
    setSaving(true)
    try {
      await update({ currency })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveRate() {
    setSaving(true)
    try {
      const parsed = parseInt(customRate, 10)
      await update({ customUsdToIdr: isNaN(parsed) || parsed <= 0 ? 0 : parsed })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleRefreshRate() {
    setRefreshing(true)
    try {
      setCustomRate("")
      await update({ customUsdToIdr: 0 })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Currency setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="size-4 text-primary" />
            Mata Uang Tampilan
          </CardTitle>
          <CardDescription>
            Pilih mata uang yang digunakan untuk menampilkan harga di seluruh aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(["USD", "IDR"] as const).map((cur) => (
              <button
                key={cur}
                disabled={saving}
                onClick={() => handleSaveCurrency(cur)}
                className={cn(
                  "relative flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                  settings.currency === cur
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/30 hover:bg-muted/40",
                )}
              >
                {settings.currency === cur && (
                  <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary">
                    <Check className="size-3 text-primary-foreground" />
                  </span>
                )}
                <span className="font-mono text-xl font-bold">
                  {cur === "USD" ? "$" : "Rp"}
                </span>
                <span className="text-sm font-semibold">{cur}</span>
                <span className="text-muted-foreground text-xs">
                  {cur === "USD" ? "Dolar Amerika" : "Rupiah Indonesia"}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exchange rate setting — only relevant when IDR */}
      {settings.currency === "IDR" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kurs USD → IDR</CardTitle>
            <CardDescription>
              Kurs digunakan untuk mengkonversi harga dari USD ke Rupiah.
              Kurs otomatis diperbarui dari internet setiap sesi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current rate display */}
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-1">
                {settings.customUsdToIdr > 0 ? "Kurs Custom" : "Kurs Live"}
              </p>
              <p className="font-mono text-2xl font-bold">
                Rp {formatNumber(settings.usdToIdr)}
                <span className="text-muted-foreground ml-2 text-sm font-normal">/ 1 USD</span>
              </p>
            </div>

            {/* Custom rate input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Override kurs manual (kosongkan untuk gunakan kurs otomatis)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder={String(settings.usdToIdr)}
                    min={1}
                    className="w-full rounded-lg border px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleSaveRate}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    saved
                      ? "bg-green-500/10 text-green-500"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="size-3.5" />
                  ) : null}
                  {saved ? "Tersimpan" : "Simpan"}
                </button>
              </div>
            </div>

            {/* Refresh live rate */}
            <button
              onClick={handleRefreshRate}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {refreshing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Ambil kurs terbaru dari internet
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
