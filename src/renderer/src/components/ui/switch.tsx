import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <span className="relative inline-flex h-6 w-10 shrink-0">
    <input ref={ref} type="checkbox" className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0" {...props} />
    <span
      className={cn(
        'flex h-6 w-10 items-center rounded-full bg-muted border border-border transition-colors',
        'peer-checked:bg-brand peer-checked:border-brand peer-checked:[&>span]:translate-x-5',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-50',
        className
      )}
    >
      <span className="size-4 translate-x-1 rounded-full bg-white shadow-sm transition-transform" />
    </span>
  </span>
))
Switch.displayName = 'Switch'
