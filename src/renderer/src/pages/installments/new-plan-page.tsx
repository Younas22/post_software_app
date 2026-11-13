import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Package, ShieldCheck, Trash2, User, Wallet } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { Textarea } from '@renderer/components/ui/textarea'
import { Alert } from '@renderer/components/ui/alert'
import { IconButton } from '@renderer/components/ui/icon-button'
import { InstallmentsGate } from '@renderer/components/installments/installment-ui'
import { RemotePicker } from '@renderer/components/installments/remote-picker'
import { CustomerPhotoCapture } from '@renderer/components/installments/customer-photo-capture'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { PERMISSIONS } from '@renderer/lib/navPermissions'
import { remote, RemoteError } from '@renderer/lib/remote'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useTerms } from '@renderer/lib/use-branding'
import { cn } from '@renderer/lib/cn'
import { addPeriod, FREQUENCY_LABEL, isoDate, type InstallmentFrequency, type InstallmentPlan } from '@renderer/lib/installments'
import type { PaymentMethod } from '@shared/types'

interface PickCustomer {
  id: number
  name: string
  phone: string | null
  address: string | null
  guardian_relation?: Relation | null
  guardian_name?: string | null
  has_photo?: boolean
}

type Relation = 'S/O' | 'D/O' | 'W/O'

interface PickProduct {
  id: number
  name: string
  sku: string
  sale_price: string | number
  type?: 'product' | 'service'
  stock?: number | null
}

interface Line {
  product: PickProduct
  quantity: number
  unitPrice: string
  serial: string
}

const COUNT_PRESETS = [3, 6, 9, 12, 18, 24]

export function NewInstallmentPlanPage(): React.JSX.Element {
  return (
    <InstallmentsGate>
      <PlanForm />
    </InstallmentsGate>
  )
}

function PlanForm(): React.JSX.Element {
  const navigate = useNavigate()
  const terms = useTerms()
  const branch = useAppStore((s) => s.branch)
  const today = isoDate(new Date())

  const [customer, setCustomer] = useState<PickCustomer | null>(null)
  const [customerCnic, setCustomerCnic] = useState('')
  const [relation, setRelation] = useState<Relation>('S/O')
  const [guardianName, setGuardianName] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const canListStaff = useAuthStore((s) => s.hasPermission(PERMISSIONS.usersView))
  const [staff, setStaff] = useState<Array<{ id: number; name: string }>>([])
  const [officerId, setOfficerId] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [markup, setMarkup] = useState('0')
  const [downPayment, setDownPayment] = useState('0')
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [methodId, setMethodId] = useState('')
  const [count, setCount] = useState(12)
  const [frequency, setFrequency] = useState<InstallmentFrequency>('monthly')
  const [startDate, setStartDate] = useState(today)
  const [firstDue, setFirstDue] = useState(addPeriod(today, 'monthly', 1))
  const [firstDueTouched, setFirstDueTouched] = useState(false)
  const [guarantor, setGuarantor] = useState({ name: '', phone: '', cnic: '', address: '' })
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void window.pos.catalog.listPaymentMethods().then((list) => {
      setMethods(list)
      const cash = list.find((m) => m.slug === 'cash') ?? list[0]
      if (cash) setMethodId(String(cash.id))
    })
  }, [])

  useEffect(() => {
    if (!canListStaff) return
    remote
      .get<Array<{ id: number; name: string }>>('/employees', { per_page: 100, status: 'active' })
      .then(({ data }) => setStaff(data))
      .catch(() => setStaff([]))
  }, [canListStaff])

  // Picking a customer brings in what's on file: guardian + their saved photo.
  useEffect(() => {
    setRelation(customer?.guardian_relation ?? 'S/O')
    setGuardianName(customer?.guardian_name ?? '')
    setPhoto(null)
    setSavedPhoto(null)
    if (!customer?.has_photo) return
    let cancelled = false
    void window.pos.media.customerPhoto(customer.id).then((uri) => {
      if (!cancelled) setSavedPhoto(uri)
    })
    return () => {
      cancelled = true
    }
  }, [customer])

  const updateStart = (value: string, freq = frequency): void => {
    setStartDate(value)
    if (!firstDueTouched && value) setFirstDue(addPeriod(value, freq, 1))
  }

  const addProduct = (product: PickProduct): void => {
    setLines((prev) =>
      prev.some((l) => l.product.id === product.id)
        ? prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { product, quantity: 1, unitPrice: String(Number(product.sale_price)), serial: '' }]
    )
  }

  const calc = useMemo(() => {
    const subtotal = Math.round(lines.reduce((sum, l) => sum + (Number(l.unitPrice) || 0) * l.quantity, 0) * 100) / 100
    const markupAmount = Math.round(subtotal * (Number(markup) || 0)) / 100
    const total = Math.round((subtotal + markupAmount) * 100) / 100
    const down = Number(downPayment) || 0
    const financed = Math.max(0, Math.round((total - down) * 100) / 100)
    const n = Math.max(1, count || 1)
    const installment = Math.floor((financed / n) * 100) / 100
    const last = Math.round((financed - installment * (n - 1)) * 100) / 100
    const schedule = Array.from({ length: n }, (_, i) => ({ sequence: i + 1, due: firstDue ? addPeriod(firstDue, frequency, i) : '', amount: i === n - 1 ? last : installment }))
    return { subtotal, markupAmount, total, down, financed, installment, last, schedule }
  }, [lines, markup, downPayment, count, firstDue, frequency])

  async function createCustomer(name: string): Promise<void> {
    try {
      const { data } = await remote.post<PickCustomer>('/customers', { name, status: 'active' })
      setCustomer(data)
      toast({ variant: 'success', title: `${terms.customer} "${name}" added` })
    } catch (err) {
      toast({ variant: 'error', title: `Couldn't add ${terms.customer.toLowerCase()}`, description: err instanceof Error ? err.message : undefined })
    }
  }

  async function submit(): Promise<void> {
    setError(null)
    if (!branch) return setError('This device has no branch yet — sync first.')
    if (!customer) return setError(`Choose the ${terms.customer.toLowerCase()} buying on installments.`)
    if (lines.length === 0) return setError(`Add at least one ${terms.product.toLowerCase()}.`)
    if (calc.down > calc.total) return setError("The down payment can't be more than the total price.")
    setSaving(true)
    try {
      // Customer details printed on the recovery receipt live on the customer record.
      if ((customer.guardian_name ?? '') !== guardianName.trim() || (customer.guardian_relation ?? 'S/O') !== relation) {
        await remote.put(`/customers/${customer.id}`, {
          name: customer.name,
          status: 'active',
          guardian_relation: guardianName.trim() ? relation : null,
          guardian_name: guardianName.trim() || null
        })
      }
      if (photo) {
        const res = await window.pos.remote.upload({
          path: `/customers/${customer.id}/photo`,
          files: [{ field: 'photo', name: 'customer.jpg', type: photo.type || 'image/jpeg', data: await photo.arrayBuffer() }]
        })
        if (!res.ok) throw new Error(res.errors?.photo?.[0] ?? res.message ?? "The customer photo couldn't be saved.")
      }
      const { data } = await remote.post<InstallmentPlan>('/installments', {
        branch_id: branch.id,
        customer_id: customer.id,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity, unit_price: Number(l.unitPrice) || 0, serial_number: l.serial || null })),
        markup_percent: Number(markup) || 0,
        down_payment: calc.down,
        payment_method_id: calc.down > 0 && methodId ? Number(methodId) : null,
        installments_count: count,
        frequency,
        start_date: startDate,
        first_due_date: firstDue,
        customer_cnic: customerCnic || null,
        guarantor_name: guarantor.name || null,
        guarantor_phone: guarantor.phone || null,
        guarantor_cnic: guarantor.cnic || null,
        guarantor_address: guarantor.address || null,
        notes: notes || null,
        recovery_officer_id: officerId ? Number(officerId) : user?.id ?? null
      })
      toast({ variant: 'success', title: `Plan ${data.plan_number} created` })
      navigate(`/installments/${data.id}`)
    } catch (err) {
      if (err instanceof RemoteError) setError(Object.values(err.errors)[0]?.[0] ?? err.message)
      else setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <button onClick={() => navigate('/installments')} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Installment Plans
        </button>
        <h1 className="text-2xl font-bold tracking-tight">New Installment Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hand over the goods today and split the price into easy {FREQUENCY_LABEL[frequency].toLowerCase()} payments
          {branch ? ` · ${branch.name}` : ''}.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Section icon={User} step={1} title={terms.customer}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-sm font-medium">
                  {terms.customer} <span className="text-error">*</span>
                </p>
                <RemotePicker<PickCustomer>
                  path="/customers"
                  params={{ status: 'active' }}
                  placeholder={`Search or add a ${terms.customer.toLowerCase()}…`}
                  selectedLabel={customer ? `${customer.name}${customer.phone ? ` · ${customer.phone}` : ''}` : null}
                  renderOption={(c) => (
                    <>
                      <span className="block font-medium">{c.name}</span>
                      {c.phone && <span className="block text-xs text-muted-foreground">{c.phone}</span>}
                    </>
                  )}
                  onSelect={setCustomer}
                  onCreate={(name) => void createCustomer(name)}
                  createLabel={(name) => `Add ${terms.customer.toLowerCase()} "${name}"`}
                />
              </div>
              <Field label="CNIC / ID number" hint="Optional — printed on the plan">
                <Input value={customerCnic} onChange={(e) => setCustomerCnic(e.target.value)} placeholder="35202-1234567-1" maxLength={30} />
              </Field>
              <Field label="Recovery officer" hint="Collects this account's installments">
                <Select value={officerId || String(user?.id ?? '')} onChange={(e) => setOfficerId(e.target.value)}>
                  {user && <option value={user.id}>{user.name} (me)</option>}
                  {staff
                    .filter((s) => s.id !== user?.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Relation">
                <Select value={relation} onChange={(e) => setRelation(e.target.value as Relation)} disabled={!customer}>
                  <option value="S/O">S/O — son of</option>
                  <option value="D/O">D/O — daughter of</option>
                  <option value="W/O">W/O — wife of</option>
                </Select>
              </Field>
              <Field label="Father / husband name" hint="Printed on the receipt">
                <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} maxLength={255} disabled={!customer} />
              </Field>
              {customer && (
                <div className="sm:col-span-2">
                  <CustomerPhotoCapture saved={savedPhoto} value={photo} onChange={setPhoto} />
                </div>
              )}
            </div>
          </Section>

          <Section icon={Package} step={2} title={terms.products}>
            <RemotePicker<PickProduct>
              path="/products"
              params={{ status: 'active' }}
              placeholder={`Search ${terms.products.toLowerCase()} by name, SKU or barcode…`}
              renderOption={(p) => (
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.sku}
                      {p.type !== 'service' && p.stock != null ? ` · ${p.stock} in stock` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatMoney(Number(p.sale_price))}</span>
                </span>
              )}
              onSelect={addProduct}
            />
            {lines.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No {terms.products.toLowerCase()} added yet.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                {lines.map((line, idx) => (
                  <div key={line.product.id} className="grid grid-cols-[minmax(0,1fr)_90px_130px_160px_auto] items-end gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.product.name}</p>
                      <p className="text-xs text-muted-foreground">{line.product.sku}</p>
                    </div>
                    <Field label="Qty">
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) } : l)))}
                      />
                    </Field>
                    <Field label="Cash price">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitPrice: e.target.value } : l)))}
                      />
                    </Field>
                    <Field label="Serial / IMEI">
                      <Input value={line.serial} maxLength={100} onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, serial: e.target.value } : l)))} />
                    </Field>
                    <IconButton aria-label={`Remove ${line.product.name}`} onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={CalendarClock} step={3} title="Payment terms">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Markup %" hint="Profit added for selling on installments">
                <Input type="number" min={0} max={500} step="0.5" value={markup} onChange={(e) => setMarkup(e.target.value)} />
              </Field>
              <Field label="Down payment" hint="Received today">
                <Input type="number" min={0} step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
              </Field>
              <Field label="Down payment via">
                <Select value={methodId} onChange={(e) => setMethodId(e.target.value)} disabled={calc.down <= 0}>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="space-y-1.5 sm:col-span-3">
                <p className="text-sm font-medium">
                  Number of installments <span className="text-error">*</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {COUNT_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={cn(
                        'h-10 min-w-12 rounded-xl border px-3 text-sm font-semibold transition-colors',
                        count === n ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card hover:bg-muted'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={count}
                    onChange={(e) => setCount(Math.min(120, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-24"
                    aria-label="Custom number of installments"
                  />
                </div>
              </div>
              <Field label="Frequency" required>
                <Select
                  value={frequency}
                  onChange={(e) => {
                    const f = e.target.value as InstallmentFrequency
                    setFrequency(f)
                    if (!firstDueTouched && startDate) setFirstDue(addPeriod(startDate, f, 1))
                  }}
                >
                  {(Object.keys(FREQUENCY_LABEL) as InstallmentFrequency[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABEL[f]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sale date" required>
                <Input type="date" value={startDate} onChange={(e) => updateStart(e.target.value)} />
              </Field>
              <Field label="First installment due" required>
                <Input
                  type="date"
                  value={firstDue}
                  min={startDate}
                  onChange={(e) => {
                    setFirstDue(e.target.value)
                    setFirstDueTouched(true)
                  }}
                />
              </Field>
            </div>
          </Section>

          <Section icon={ShieldCheck} step={4} title="Guarantor" optional>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={guarantor.name} maxLength={255} onChange={(e) => setGuarantor({ ...guarantor, name: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={guarantor.phone} maxLength={30} onChange={(e) => setGuarantor({ ...guarantor, phone: e.target.value })} />
              </Field>
              <Field label="CNIC / ID number">
                <Input value={guarantor.cnic} maxLength={30} onChange={(e) => setGuarantor({ ...guarantor, cnic: e.target.value })} />
              </Field>
              <Field label="Address">
                <Input value={guarantor.address} maxLength={255} onChange={(e) => setGuarantor({ ...guarantor, address: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <Textarea rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="bg-brand p-5 text-brand-foreground">
              <p className="text-sm font-medium opacity-85">
                {count} × {FREQUENCY_LABEL[frequency].toLowerCase()} installment{count === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{formatMoney(calc.installment)}</p>
              {calc.last !== calc.installment && count > 1 && <p className="mt-1 text-xs opacity-85">Last installment {formatMoney(calc.last)}</p>}
            </div>
            <div className="space-y-2.5 p-5 text-sm">
              <Row label="Cash price" value={formatMoney(calc.subtotal)} />
              <Row label={`Markup (${Number(markup) || 0}%)`} value={`+ ${formatMoney(calc.markupAmount)}`} />
              <Row label="Installment price" value={formatMoney(calc.total)} strong />
              <Row label="Down payment" value={`− ${formatMoney(calc.down)}`} />
              <div className="border-t border-border pt-2.5">
                <Row label="To be paid in installments" value={formatMoney(calc.financed)} strong />
              </div>
            </div>
            <div className="border-t border-border px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule preview</p>
              <ol className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm">
                {calc.schedule.map((row) => (
                  <li key={row.sequence} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      <span className="inline-block w-6 font-medium text-foreground">{row.sequence}.</span>
                      {row.due ? formatDate(row.due) : '—'}
                    </span>
                    <span className="font-medium">{formatMoney(row.amount)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex gap-2 border-t border-border p-5">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/installments')}>
                Cancel
              </Button>
              <Button className="flex-[2]" onClick={submit} loading={saving} disabled={lines.length === 0 || !customer}>
                <Wallet className="size-4" /> Create plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  step,
  title,
  optional,
  children
}: {
  icon: typeof User
  step: number
  title: string
  optional?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon className="size-[18px]" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Step {step}</p>
          <h2 className="text-base font-semibold">
            {title} {optional && <span className="text-xs font-normal text-muted-foreground">(optional)</span>}
          </h2>
        </div>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('tabular-nums', strong && 'font-semibold')}>{value}</span>
    </div>
  )
}
