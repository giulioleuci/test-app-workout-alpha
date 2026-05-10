import * as React from "react"

import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface StepperProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string
  onValueChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  label?: string
  containerClassName?: string
  inputClassName?: string
  buttonClassName?: string
}

export function Stepper({
  value,
  onValueChange,
  step = 1,
  min,
  max,
  label,
  containerClassName,
  inputClassName,
  buttonClassName,
  className,
  ...props
}: StepperProps) {
  const numVal = typeof value === "string" ? (value === "" ? 0 : Number(value)) : value

  const handleDecrement = () => {
    const newValue = Math.max(min ?? -Infinity, numVal - step)
    onValueChange(newValue)
  }

  const handleIncrement = () => {
    const newValue = Math.min(max ?? Infinity, numVal + step)
    onValueChange(newValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(Number(e.target.value))
  }

  return (
    <div className={cn("space-y-0.5", containerClassName)}>
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
      <div className={cn("flex items-center gap-0.5", className)}>
        <Button
          variant="outline"
          size="icon"
          className={cn("h-9 w-9 shrink-0 rounded-full", buttonClassName)}
          onClick={handleDecrement}
          type="button"
          tabIndex={-1}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={handleChange}
          className={cn("h-9 text-center font-semibold text-sm min-w-0", inputClassName)}
          step={step}
          min={min}
          max={max}
          {...props}
        />
        <Button
          variant="outline"
          size="icon"
          className={cn("h-9 w-9 shrink-0 rounded-full", buttonClassName)}
          onClick={handleIncrement}
          type="button"
          tabIndex={-1}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
