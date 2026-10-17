import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SelectItem } from "@/components/ui/select"
import { tradeInputSchema } from "@/server/trades"
import type { TradeInput } from "@/server/trades"
import { TextInput } from "@/components/inputs/TextInput"
import { TextAreaInput } from "@/components/inputs/TextAreaInput"
import { SelectInput } from "@/components/inputs/SelectInput"
import { CheckboxInput } from "@/components/inputs/CheckboxInput"

interface TradeFormProps {
  defaultValues?: Partial<TradeInput>
  onSubmit: (data: TradeInput) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function TradeForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Save Trade",
}: TradeFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TradeInput>({
    resolver: zodResolver(tradeInputSchema),
    defaultValues: {
      direction: "LONG",
      entryMistake: false,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <TextInput
            label="SYMBOL"
            placeholder="BTCUSDT"
            error={errors.symbol?.message}
            {...register("symbol")}
          />

          <Controller
            name="direction"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="DIRECTION"
                value={field.value}
                onValueChange={field.onChange}
                error={errors.direction?.message}
              >
                <SelectItem value="LONG">LONG</SelectItem>
                <SelectItem value="SHORT">SHORT</SelectItem>
              </SelectInput>
            )}
          />

          <TextInput
            label="ENTRY PRICE"
            type="number"
            step="any"
            placeholder="0.00"
            error={errors.entryPrice?.message}
            {...register("entryPrice", { valueAsNumber: true })}
          />

          <TextInput
            label="EXIT PRICE (optional)"
            type="number"
            step="any"
            placeholder="0.00"
            error={errors.exitPrice?.message}
            {...register("exitPrice", {
              valueAsNumber: true,
              setValueAs: (v) => (v === "" || isNaN(v) ? undefined : v),
            })}
          />

          <TextInput
            label="STOP LOSS"
            type="number"
            step="any"
            placeholder="0.00"
            error={errors.stopLoss?.message}
            {...register("stopLoss", { valueAsNumber: true })}
          />

          <TextInput
            label="TAKE PROFIT"
            type="number"
            step="any"
            placeholder="0.00"
            error={errors.takeProfit?.message}
            {...register("takeProfit", { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <Controller
            name="outcome"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="OUTCOME (optional)"
                placeholder="— Open —"
                value={field.value}
                onValueChange={field.onChange}
                error={errors.outcome?.message}
              >
                <SelectItem value="WIN">WIN</SelectItem>
                <SelectItem value="LOSS">LOSS</SelectItem>
                <SelectItem value="BREAKEVEN">BREAKEVEN</SelectItem>
              </SelectInput>
            )}
          />

          <TextInput
            label="SETUP TYPE (optional)"
            placeholder="e.g. Breakout, Reversal"
            error={errors.setupType?.message}
            {...register("setupType")}
          />

          <TextInput
            label="CLOSED AT (optional)"
            type="datetime-local"
            error={errors.closedAt?.message}
            {...register("closedAt")}
          />

          <Controller
            name="entryMistake"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="ENTRY MISTAKE"
                checkboxLabel="Ada kesalahan saat entry"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <div className="sm:col-span-2">
            <TextAreaInput
              label="EMOTION NOTE (optional)"
              placeholder="Bagaimana kondisi emosi saat trade ini?"
              error={errors.emotionNote?.message}
              {...register("emotionNote")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
