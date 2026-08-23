import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '@shared/types'
import { IconButton } from './icon-button'

export function Pagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }): React.JSX.Element | null {
  if (meta.last_page <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span>
        Showing {meta.from ?? 0}&ndash;{meta.to ?? 0} of {meta.total}
      </span>
      <div className="flex items-center gap-1">
        <IconButton
          aria-label="Previous page"
          disabled={meta.current_page <= 1}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <span className="px-2 tabular-nums">
          {meta.current_page} / {meta.last_page}
        </span>
        <IconButton
          aria-label="Next page"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
    </div>
  )
}
