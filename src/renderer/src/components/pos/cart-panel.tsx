import { Minus, Plus, Trash2, UserRound, ShoppingCart, Lock } from 'lucide-react'
import { usePosStore } from '@renderer/lib/stores/posStore'
import { Button } from '@renderer/components/ui/button'
import { IconButton } from '@renderer/components/ui/icon-button'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatMoney } from '@renderer/lib/format'
import { cn } from '@renderer/lib/cn'
import { toast } from '@renderer/lib/stores/toastStore'

interface CartPanelProps {
  selectedProductId: number | null
  onSelectLine: (productId: number) => void
  onOpenCustomer: () => void
  onCheckout: () => void
  checkoutDisabled?: boolean
}

export function CartPanel({ selectedProductId, onSelectLine, onOpenCustomer, onCheckout, checkoutDisabled }: CartPanelProps): React.JSX.Element {
  const { lines, customer, updateQuantity, removeLine, subtotal, totalDiscount, totalTax, total } = usePosStore()

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" /> Cart
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCustomer}
            className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-border"
          >
            <UserRound className="size-3.5" />
            {customer ? customer.name : 'Walk-in (F8)'}
          </button>
          <IconButton
            aria-label="Open cash drawer"
            title="Open cash drawer"
            onClick={async () => {
              const result = await window.pos.printer.openCashDrawer()
              if (!result.ok) toast({ variant: 'warning', title: 'Cash drawer', description: result.message })
            }}
          >
            <Lock className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <EmptyState title="Cart is empty" description="Search or scan a product to add it." />
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <li
                key={line.product.id}
                onClick={() => onSelectLine(line.product.id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 cursor-pointer', selectedProductId === line.product.id && 'bg-brand-soft/40')}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatMoney(line.product.sale_price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="flex size-6 items-center justify-center rounded border border-border hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(line.product.id, line.quantity - 1)
                    }}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                  <button
                    className="flex size-6 items-center justify-center rounded border border-border hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(line.product.id, line.quantity + 1)
                    }}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-medium">{formatMoney(line.product.sale_price * line.quantity - line.discount)}</span>
                <button
                  className="text-muted-foreground hover:text-error"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeLine(line.product.id)
                  }}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal())}</span>
        </div>
        {totalDiscount() > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Discount</span>
            <span>&minus;{formatMoney(totalDiscount())}</span>
          </div>
        )}
        {totalTax() > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span>{formatMoney(totalTax())}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(total())}</span>
        </div>
      </div>

      <div className="p-4 pt-0">
        <Button className="w-full" size="lg" disabled={lines.length === 0 || checkoutDisabled} onClick={onCheckout}>
          Checkout (F4)
        </Button>
      </div>
    </div>
  )
}
