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
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 bg-muted/95 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <tbody {...props} />
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): React.JSX.Element {
  return <tr className={cn('border-t border-border transition-colors hover:bg-muted/40', className)} {...props} />
}

// Desktop row height/inset is a step up from the web app's compact
// px-4/py-2.5 table — the same "more breathing room on a bigger screen"
// principle as the Button/Input size bumps above.
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <th className={cn('px-5 py-3 font-medium', className)} {...props} />
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element {
  return <td className={cn('px-5 py-3.5 align-middle', className)} {...props} />
}
