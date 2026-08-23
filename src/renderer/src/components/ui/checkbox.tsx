import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@renderer/lib/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <span className="relative inline-flex size-4 shrink-0">
    <input ref={ref} type="checkbox" className="peer absolute inset-0 z-10 size-4 cursor-pointer opacity-0" {...props} />
    <span
      className={cn(
        'flex size-4 items-center justify-center rounded border border-input bg-[var(--input-background)] transition-colors',
        'peer-checked:bg-brand peer-checked:border-brand peer-checked:[&>svg]:opacity-100',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-50',
        className
      )}
    >
      <Check className="size-3 text-brand-foreground opacity-0 transition-opacity" />
    </span>
  </span>
))
Checkbox.displayName = 'Checkbox'
