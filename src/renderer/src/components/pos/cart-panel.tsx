import { Minus, Plus, Trash2, UserRound, ShoppingCart, Lock } from 'lucide-react'
import { usePosStore } from '@renderer/lib/stores/posStore'
import { Button } from '@renderer/components/ui/button'
import { IconButton } from '@renderer/components/ui/icon-button'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatMoney } from '@renderer/lib/format'
import { cn } from '@renderer/lib/cn'
import { toast } from '@renderer/lib/stores/toastStore'
import { DiscountPopover } from './discount-popover'

interface CartPanelProps {
  selectedProductId: number | null
  onSelectLine: (productId: number) => void
  onOpenCustomer: () => void
  onCheckout: () => void
  checkoutDisabled?: boolean
}

export function CartPanel({ selectedProductId, onSelectLine, onOpenCustomer, onCheckout, checkoutDisabled }: CartPanelProps): React.JSX.Element {
  const { lines, customer, updateQuantity, removeLine, applyDiscountToAll, clear, subtotal, totalDiscount, totalTax, total } = usePosStore()

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShoppingCart className="size-[18px]" /> Cart
          {lines.length > 0 && <span className="text-sm font-normal text-muted-foreground">({lines.length})</span>}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCustomer}
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-border"
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
          {lines.length > 0 && (
            <>
              <DiscountPopover onApply={applyDiscountToAll} />
              <IconButton aria-label="Clear cart" title="Clear cart" onClick={clear}>
                <Trash2 className="size-4 text-error" />
              </IconButton>
            </>
          )}
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
                className={cn('flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors', selectedProductId === line.product.id && 'bg-brand-soft/40')}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(line.product.sale_price)} each
                    {line.discount > 0 && <span className="text-error"> &middot; &minus;{formatMoney(line.discount)}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="flex size-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(line.product.id, line.quantity - 1)
                    }}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-medium tabular-nums">{line.quantity}</span>
                  <button
                    className="flex size-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(line.product.id, line.quantity + 1)
                    }}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-semibold">{formatMoney(line.product.sale_price * line.quantity - line.discount)}</span>
                <button
                  className="text-muted-foreground transition-colors hover:text-error"
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

      <div className="space-y-2 border-t border-border px-5 py-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal())}</span>
        </div>
        {totalDiscount() > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Discount</span>
            <span className="tabular-nums">&minus;{formatMoney(totalDiscount())}</span>
          </div>
        )}
        {totalTax() > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (est.)</span>
            <span className="tabular-nums">{formatMoney(totalTax())}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(total())}</span>
        </div>
      </div>

      <div className="p-5 pt-0">
        <Button className="w-full" size="lg" disabled={lines.length === 0 || checkoutDisabled} onClick={onCheckout}>
          Charge {formatMoney(total())} (F4)
        </Button>
      </div>
    </div>
  )
}
