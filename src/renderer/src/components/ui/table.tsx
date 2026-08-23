import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>): React.JSX.Element {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <thead className={cn('bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground', className)} {...props} />
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <tbody {...props} />
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): React.JSX.Element {
  return <tr className={cn('border-t border-border transition-colors hover:bg-muted/40', className)} {...props} />
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <th className={cn('px-4 py-2.5 font-medium', className)} {...props} />
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <td className={cn('px-4 py-2.5 align-middle', className)} {...props} />
}
