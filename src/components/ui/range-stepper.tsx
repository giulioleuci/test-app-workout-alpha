import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/ui/stepper"
import { cn } from "@/lib/utils"

export interface RangeStepperProps {
  label?: string
  minVal: number | string
  maxVal: number | string
  onMinChange: (value: number) => void
  onMaxChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  placeholderMin?: string
  placeholderMax?: string
  className?: string
}

export function RangeStepper({
  label,
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
  step = 1,
  min,
  max,
  placeholderMin,
  placeholderMax,
  className,
}: RangeStepperProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label className="text-caption text-muted-foreground">{label}</Label>}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <Stepper
          value={minVal}
          onValueChange={onMinChange}
          step={step}
          min={min}
          max={max}
          placeholder={placeholderMin}
          label="Min"
        />
        <Stepper
          value={maxVal}
          onValueChange={onMaxChange}
          step={step}
          min={min}
          max={max}
          placeholder={placeholderMax}
          label="Max"
        />
      </div>
    </div>
  )
}
