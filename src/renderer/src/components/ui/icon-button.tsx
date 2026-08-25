import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: 'ghost' | 'outline' | 'primary'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center size-10 rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        variant === 'ghost' && 'hover:bg-muted text-foreground',
        variant === 'outline' && 'border border-border hover:bg-muted text-foreground',
        variant === 'primary' && 'bg-brand text-brand-foreground hover:bg-brand-hover',
        className
      )}
      {...props}
    />
  )
)
IconButton.displayName = 'IconButton'
