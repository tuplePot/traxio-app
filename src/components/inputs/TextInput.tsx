import { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TextInputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
  description?: string
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, description, id, className, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined)
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
        <Input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={className}
          {...props}
        />
        {description && (
          <p className="text-[10px] text-muted-foreground">{description}</p>
        )}
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    )
  }
)
TextInput.displayName = "TextInput"

export { TextInput }
