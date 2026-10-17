import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { INTERVALS, INTERVAL_LABELS } from "../../constants"
import type { Interval } from "../../types"

interface IntervalSelectorProps {
  value: Interval
  onChange: (interval: Interval) => void
}

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <ButtonGroup aria-label="Interval chart">
      {INTERVALS.map((iv) => (
        <Button
          key={iv}
          size="xs"
          variant={value === iv ? "secondary" : "outline"}
          aria-pressed={value === iv}
          className="font-mono"
          onClick={() => onChange(iv)}
        >
          {INTERVAL_LABELS[iv]}
        </Button>
      ))}
    </ButtonGroup>
  )
}
