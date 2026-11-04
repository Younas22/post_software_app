import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react'
import { remote } from '@renderer/lib/remote'
import { cn } from '@renderer/lib/cn'

/**
 * Searchable picker backed by a server list endpoint (/customers, /products)
 * — used where the full, live catalog matters (installment plans), rather
 * than the device's offline SQLite cache.
 */
export function RemotePicker<T extends { id: number }>({
  path,
  params,
  placeholder,
  selectedLabel,
  renderOption,
  onSelect,
  onCreate,
  createLabel
}: {
  path: string
  params?: Record<string, string | number | boolean | undefined>
  placeholder: string
  selectedLabel?: string | null
  renderOption: (row: T) => React.ReactNode
  onSelect: (row: T) => void
  onCreate?: (text: string) => void
  createLabel?: (text: string) => string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const timer = setTimeout(() => {
      remote
        .get<T[]>(path, { ...params, search: query || undefined, per_page: 20 })
        .then(({ data }) => setRows(data))
        .catch(() => setRows([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, path])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-[var(--input-background)] px-3.5 text-left text-sm"
      >
        <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="h-11 w-full bg-transparent pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    onSelect(row)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  {renderOption(row)}
                </button>
              ))
            )}
          </div>
          {onCreate && query.trim() && (
            <button
              type="button"
              onClick={() => {
                onCreate(query.trim())
                setOpen(false)
                setQuery('')
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left text-sm font-medium text-brand hover:bg-muted"
            >
              <Plus className="size-4" /> {createLabel ? createLabel(query.trim()) : `Add "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
