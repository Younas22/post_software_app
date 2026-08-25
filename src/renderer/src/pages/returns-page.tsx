import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TableSkeleton } from '@renderer/components/ui/loading-state'
import { Pagination } from '@renderer/components/ui/pagination'
import { remote } from '@renderer/lib/remote'
import { formatDateTime, formatMoney } from '@renderer/lib/format'
import { toast } from '@renderer/lib/stores/toastStore'
import type { PaginationMeta } from '@shared/types'

interface ReturnRow {
  id: number
  reference: string
  reason: string | null
  refund_amount: number
  status: string
  created_at: string
  sale?: { invoice_number: string } | null
}

export function ReturnsPage(): React.JSX.Element {
  const [rows, setRows] = useState<ReturnRow[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    remote
      .get<ReturnRow[]>('/returns', { page })
      .then(({ data, meta: m }) => {
        setRows(data)
        setMeta(m ?? null)
      })
      .catch((err) => toast({ variant: 'error', title: 'Could not load returns', description: err instanceof Error ? err.message : undefined }))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Returns</h1>
        <p className="text-sm text-muted-foreground">Refunds processed against completed sales.</p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border">
          <TableSkeleton />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No returns yet" description="Returns are created from a sale's detail in Sales History." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Reference</TH>
              <TH>Sale</TH>
              <TH>Date</TH>
              <TH className="text-right">Refund</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.reference}</TD>
                <TD>{r.sale?.invoice_number ?? '—'}</TD>
                <TD>{formatDateTime(r.created_at)}</TD>
                <TD className="text-right">{formatMoney(r.refund_amount)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  )
}
