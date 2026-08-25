import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full rounded-md border bg-[var(--input-background)] px-3.5 py-2.5 text-sm text-foreground',
      'placeholder:text-muted-foreground transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      invalid ? 'border-error' : 'border-input',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
