import * as React from "react"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SelectInputProps {
  label?: string
  error?: string
  description?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string | null) => void
  disabled?: boolean
  className?: string
  /** Label per value — supaya trigger menampilkan label, bukan value mentah. */
  items?: ReadonlyArray<{ label: React.ReactNode; value: string }>
  children: React.ReactNode
}

function SelectInput({
  label,
  error,
  description,
  placeholder,
  value,
  onValueChange,
  disabled,
  className,
  items,
  children,
}: SelectInputProps) {
  const inputId = label?.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label
          htmlFor={inputId}
          className="text-[10px] tracking-widest text-muted-foreground"
        >
          {label}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        items={items}
      >
        <SelectTrigger
          className={cn("w-full", className)}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      {description && (
        <p className="text-[10px] text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}

export { SelectInput }
