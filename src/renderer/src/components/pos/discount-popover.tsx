import { useState } from 'react'
import { Percent } from 'lucide-react'
import { Dropdown } from '@renderer/components/ui/dropdown'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { IconButton } from '@renderer/components/ui/icon-button'
import { cn } from '@renderer/lib/cn'

/**
 * Cart-wide discount quick-apply — Fixed amount or Percentage, applied to
 * every line at once. Mirrors post_software_web's DiscountPopover exactly
 * (same two modes, same "Apply" flow) — this app's `posStore.applyDiscountToAll`
 * uses the identical formula.
 */
export function DiscountPopover({ onApply }: { onApply: (type: 'fixed' | 'percent', value: number) => void }): React.JSX.Element {
  return (
    <Dropdown
      align="right"
      trigger={
        <IconButton aria-label="Apply discount">
          <Percent className="size-4" />
        </IconButton>
      }
    >
      {(close) => <DiscountPopoverBody onApply={onApply} close={close} />}
    </Dropdown>
  )
}

function DiscountPopoverBody({ onApply, close }: { onApply: (type: 'fixed' | 'percent', value: number) => void; close: () => void }): React.JSX.Element {
  const [type, setType] = useState<'fixed' | 'percent'>('percent')
  const [value, setValue] = useState('')

  return (
    <div className="w-64 p-2">
      <p className="mb-2 px-1 text-sm font-semibold">Apply discount</p>
      <div className="mb-3 flex gap-1 rounded-lg bg-muted p-0.5">
        {(['percent', 'fixed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
              type === t ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            )}
          >
            {t === 'percent' ? 'Percentage' : 'Fixed amount'}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
        />
        <Button
          size="sm"
          onClick={() => {
            const num = Number(value)
            if (num > 0) onApply(type, num)
            close()
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
