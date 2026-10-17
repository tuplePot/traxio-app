import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface CheckboxInputProps {
  label?: string
  checkboxLabel?: string
  error?: string
  description?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

function CheckboxInput({
  label,
  checkboxLabel,
  error,
  description,
  checked,
  onCheckedChange,
  disabled,
}: CheckboxInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10px] tracking-widest text-muted-foreground">
          {label}
        </span>
      )}
      <label className="mt-1 flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          disabled={disabled}
          aria-invalid={!!error}
        />
        {checkboxLabel && (
          <Label className="cursor-pointer text-sm font-normal">{checkboxLabel}</Label>
        )}
      </label>
      {description && (
        <p className="text-[10px] text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}

export { CheckboxInput }
