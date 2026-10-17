import { forwardRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface TextAreaInputProps extends React.ComponentProps<"textarea"> {
  label?: string
  error?: string
  description?: string
}

const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
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
        <Textarea
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
TextAreaInput.displayName = "TextAreaInput"

export { TextAreaInput }
