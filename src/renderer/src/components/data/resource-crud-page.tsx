import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import { Button } from '@renderer/components/ui/button'
import { IconButton } from '@renderer/components/ui/icon-button'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Modal } from '@renderer/components/ui/modal'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TableSkeleton } from '@renderer/components/ui/loading-state'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { Pagination } from '@renderer/components/ui/pagination'
import { StatusBadge } from '@renderer/components/ui/badge'
import { DynamicForm, type FormValues } from './dynamic-form'
import type { ColumnConfig, FormFieldConfig } from './field-config'
import type { PaginationMeta } from '@shared/types'

interface ResourceRow {
  id: number
  status?: string
}

interface ResourceCrudPageProps<T extends ResourceRow> {
  title: string
  description?: string
  path: string
  columns: ColumnConfig<T>[]
  formFields: FormFieldConfig[]
  emptyIcon?: LucideIcon
  toFormValues?: (row: T) => FormValues
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  /** When set, status changes go through these endpoints instead of DELETE (e.g. Employees). */
  activation?: { activatePath: (row: T) => string; deactivatePath: (row: T) => string }
  searchPlaceholder?: string
  /** Lets a caller inject/adjust fields the visible form doesn't collect (e.g. Employees' business_id — see BACKEND_EXTENSIONS.md bug #1). */
  transformPayload?: (values: FormValues, editing: T | null) => Record<string, unknown>
}

export function ResourceCrudPage<T extends ResourceRow>({
  title,
  description,
  path,
  columns,
  formFields,
  emptyIcon,
  toFormValues,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  activation,
  searchPlaceholder = 'Search...',
  transformPayload
}: ResourceCrudPageProps<T>): React.JSX.Element {
  const [rows, setRows] = useState<T[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, meta: pageMeta } = await remote.get<T[]>(path, { search: search || undefined, page })
      setRows(data)
      setMeta(pageMeta ?? null)
    } catch (err) {
      toast({ variant: 'error', title: 'Could not load data', description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoading(false)
    }
  }, [path, search, page])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate(): void {
    setEditing(null)
    setFormValues({})
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(row: T): void {
    setEditing(row)
    setFormValues(toFormValues ? toFormValues(row) : (row as unknown as FormValues))
    setFormErrors({})
    setModalOpen(true)
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    setFormErrors({})
    const payload = transformPayload ? transformPayload(formValues, editing) : formValues
    try {
      if (editing) {
        await remote.put(`${path}/${editing.id}`, payload)
        toast({ variant: 'success', title: `${title.replace(/s$/, '')} updated` })
      } else {
        await remote.post(path, payload)
        toast({ variant: 'success', title: `${title.replace(/s$/, '')} created` })
      }
      setModalOpen(false)
      void load()
    } catch (err) {
      if (err instanceof RemoteError) {
        setFormErrors(err.errors)
        if (Object.keys(err.errors).length === 0) {
          toast({ variant: 'error', title: 'Save failed', description: err.message })
        }
      } else {
        toast({ variant: 'error', title: 'Save failed' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await remote.delete(`${path}/${deleteTarget.id}`)
      toast({ variant: 'success', title: `${title.replace(/s$/, '')} deleted` })
      setDeleteTarget(null)
      void load()
    } catch (err) {
      toast({ variant: 'error', title: 'Delete failed', description: err instanceof Error ? err.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActivation(row: T): Promise<void> {
    if (!activation) return
    const isActive = row.status === 'active'
    try {
      await remote.patch(isActive ? activation.deactivatePath(row) : activation.activatePath(row))
      toast({ variant: 'success', title: isActive ? 'Deactivated' : 'Activated' })
      void load()
    } catch (err) {
      toast({ variant: 'error', title: 'Action failed', description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="size-4" /> New
          </Button>
        )}
      </div>

      <div className="max-w-xs">
        <SearchInput
          placeholder={searchPlaceholder}
          onSearch={(v) => {
            setSearch(v)
            setPage(1)
          }}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-border">
          <TableSkeleton />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title={`No ${title.toLowerCase()} yet`} description={search ? 'Try a different search.' : `Create your first entry to get started.`} />
      ) : (
        <Table>
          <THead>
            <TR>
              {columns.map((col) => (
                <TH key={col.header}>{col.header}</TH>
              ))}
              {(canEdit || canDelete || activation) && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                {columns.map((col) => (
                  <TD key={col.header} className={col.className}>
                    {col.render(row)}
                  </TD>
                ))}
                {(canEdit || canDelete || activation) && (
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      {activation && (
                        <IconButton
                          aria-label={row.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleActivation(row)}
                        >
                          {row.status === 'active' ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                        </IconButton>
                      )}
                      {canEdit && (
                        <IconButton aria-label="Edit" onClick={() => openEdit(row)}>
                          <Pencil className="size-4" />
                        </IconButton>
                      )}
                      {canDelete && !activation && (
                        <IconButton aria-label="Delete" onClick={() => setDeleteTarget(row)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      )}
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <DynamicForm
          fields={formFields}
          values={formValues}
          errors={formErrors}
          onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${title.replace(/s$/, '')}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export function statusBadgeColumn<T extends ResourceRow>(header = 'Status'): ColumnConfig<T> {
  return { header, render: (row) => <StatusBadge status={row.status ?? 'unknown'} /> }
}
