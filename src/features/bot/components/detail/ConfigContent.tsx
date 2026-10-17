import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Typography } from "@/components/ui/typography"
import { LoadingScreen } from "@/components/loading-screen"
import { TextInput } from "@/components/inputs/TextInput"
import { CheckboxInput } from "@/components/inputs/CheckboxInput"
import { SelectInput } from "@/components/inputs/SelectInput"
import { SelectItem } from "@/components/ui/select"
import { botConfigInputSchema, updateBotConfig } from "@/server/bot"
import type { BotConfigInput } from "@/server/bot"
import { BOT_QUERY_KEYS, botOverviewQueryOptions } from "../../queries"
import {
  RUN_INTERVAL_OPTIONS,
  TIER_MAX_NOTIONAL,
  TIERS,
} from "../../constants"

const INTERVAL_ITEMS = RUN_INTERVAL_OPTIONS.map((o) => ({
  value: String(o.minutes),
  label: o.label,
}))

const DAY_MS = 24 * 60 * 60 * 1000

export default function ConfigContent() {
  const { data, isLoading } = useQuery(botOverviewQueryOptions())
  if (isLoading || !data) return <LoadingScreen isLoading fullScreen={false} />
  const { config } = data
  const remainingDays = Math.max(
    1,
    Math.ceil((new Date(config.expiresAt).getTime() - Date.now()) / DAY_MS)
  )
  return (
    <ConfigForm
      key={config.updatedAt}
      defaultValues={{
        enabled: config.enabled,
        aiEnabled: config.aiEnabled,
        maxOrdersPerDay: config.maxOrdersPerDay,
        maxOpenPositions: config.maxOpenPositions,
        startingBalance: config.startingBalance,
        expiryDays: remainingDays,
        runIntervalMinutes: config.runIntervalMinutes,
      }}
    />
  )
}

function ConfigForm({ defaultValues }: { defaultValues: BotConfigInput }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BotConfigInput>({
    resolver: zodResolver(botConfigInputSchema),
    defaultValues,
  })

  async function onSubmit(data: BotConfigInput) {
    await updateBotConfig({ data })
    for (const queryKey of BOT_QUERY_KEYS)
      queryClient.invalidateQueries({ queryKey })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bot &amp; AI</CardTitle>
          <CardDescription>
            Pengecekan terjadwal hanya berjalan kalau bot aktif <b>dan</b>{" "}
            worker (<code>bun run bot</code>) menyala. Setelah tiap cek, ringkasan
            + jam cek berikutnya dikirim ke Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="BOT"
                checkboxLabel="Aktifkan pengecekan otomatis"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Controller
            name="runIntervalMinutes"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="JARAK CEK"
                items={INTERVAL_ITEMS}
                value={String(field.value)}
                onValueChange={(v) => v && field.onChange(Number(v))}
                description="Strategi pakai candle 4H, jadi 4 jam paling masuk akal. Interval pendek hanya untuk testing — candle yang sama dicek ulang, dan review AI bisa dipanggil tiap kali."
                error={errors.runIntervalMinutes?.message}
              >
                {INTERVAL_ITEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectInput>
            )}
          />
          <Controller
            name="aiEnabled"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="REVIEW AI"
                checkboxLabel="Minta AI menyetujui setiap setup sebelum order"
                description="AI hanya bisa menyetujui, menolak, atau menunda — tidak bisa membuat sinyal sendiri."
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Batas risiko</CardTitle>
          <CardDescription>
            Aturan tetap: LONG saja, leverage 1x, stop-loss wajib di setiap
            trade. Ukuran per tier:{" "}
            {TIERS.map((t) => `${t} $${TIER_MAX_NOTIONAL[t]}`).join(", ")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="MAKS ORDER PER HARI (UTC)"
            type="number"
            error={errors.maxOrdersPerDay?.message}
            {...register("maxOrdersPerDay", { valueAsNumber: true })}
          />
          <TextInput
            label="MAKS POSISI TERBUKA"
            type="number"
            error={errors.maxOpenPositions?.message}
            {...register("maxOpenPositions", { valueAsNumber: true })}
          />
          <TextInput
            label="MODAL AWAL PAPER (USD)"
            type="number"
            step="any"
            error={errors.startingBalance?.message}
            {...register("startingBalance", { valueAsNumber: true })}
          />
          <TextInput
            label="BERLAKU (HARI DARI SEKARANG)"
            type="number"
            description="Setelah kedaluwarsa bot tidak membuka posisi baru."
            error={errors.expiryDays?.message}
            {...register("expiryDays", { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : saved ? (
            <Check />
          ) : null}
          {saved ? "Tersimpan" : "Simpan"}
        </Button>
        <Typography variant="caption">
          Menyimpan juga mengatur ulang tanggal kedaluwarsa.
        </Typography>
      </div>
    </form>
  )
}
