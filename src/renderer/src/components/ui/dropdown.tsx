import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

interface DropdownProps {
  trigger: ReactNode
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
}

export function Dropdown({ trigger, align = 'right', children }: DropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-44 rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  danger
}: {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted',
        danger && 'text-error'
      )}
    >
      {children}
    </button>
  )
}
