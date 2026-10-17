import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SelectItem } from "@/components/ui/select"
import { Typography } from "@/components/ui/typography"
import { EmptyState } from "@/components/empty-state"
import { LoadingScreen } from "@/components/loading-screen"
import { TextInput } from "@/components/inputs/TextInput"
import { SelectInput } from "@/components/inputs/SelectInput"
import {
  addBotSymbol,
  loadDefaultBotWatchlist,
  removeBotSymbol,
} from "@/server/bot"
import { botSymbolsQueryOptions } from "../../queries"
import { TIER_MAX_NOTIONAL, TIERS } from "../../constants"
import { TierBadge } from "../BotBadges"

const addSymbolSchema = z.object({
  symbol: z.string().trim().min(1, "Wajib diisi").max(20),
  tier: z.enum(TIERS),
})

type AddSymbolInput = z.infer<typeof addSymbolSchema>

export default function WatchlistContent() {
  const queryClient = useQueryClient()
  const { data: symbols, isLoading } = useQuery(botSymbolsQueryOptions())
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddSymbolInput>({
    resolver: zodResolver(addSymbolSchema),
    defaultValues: { symbol: "", tier: "CORE" },
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["bot-symbols"] })
  }

  async function onAdd(data: AddSymbolInput) {
    await addBotSymbol({ data })
    reset({ symbol: "", tier: data.tier })
    invalidate()
  }

  async function handleRemove(id: string) {
    await removeBotSymbol({ data: { id } })
    invalidate()
  }

  async function handleLoadDefault() {
    await loadDefaultBotWatchlist()
    invalidate()
  }

  if (isLoading) return <LoadingScreen isLoading fullScreen={false} />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tambah simbol</CardTitle>
          <CardDescription>
            Simbol dasar tanpa USDT (mis. BTC). Data diambil dari pasangan USDT
            di Binance; simbol yang tidak ada akan tercatat sebagai &quot;Data
            error&quot; di log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onAdd)}
            className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_12rem_auto]"
          >
            <TextInput
              label="SIMBOL"
              placeholder="BTC"
              error={errors.symbol?.message}
              {...register("symbol")}
            />
            <Controller
              name="tier"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="TIER"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} (maks ${TIER_MAX_NOTIONAL[t]})
                    </SelectItem>
                  ))}
                </SelectInput>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              <Plus />
              Tambah
            </Button>
          </form>
        </CardContent>
      </Card>

      {!symbols || symbols.length === 0 ? (
        <EmptyState
          icon={<Star className="size-5" />}
          title="Watchlist bot masih kosong"
          description="Muat watchlist default (CORE, GROWTH, SPEC) atau tambah simbol satu per satu."
          action={
            <Button onClick={handleLoadDefault}>Muat watchlist default</Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const items = symbols.filter((s) => s.tier === tier)
            return (
              <Card key={tier}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TierBadge tier={tier} />
                    maks ${TIER_MAX_NOTIONAL[tier]} / posisi
                  </CardTitle>
                  <CardDescription>{items.length} simbol</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {items.length === 0 && (
                    <Typography variant="muted">Kosong</Typography>
                  )}
                  {items.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-md bg-muted/60 py-0.5 ps-2 pe-0.5 font-mono text-xs"
                    >
                      {s.symbol}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Hapus ${s.symbol}`}
                        onClick={() => handleRemove(s.id)}
                      >
                        <X />
                      </Button>
                    </span>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
