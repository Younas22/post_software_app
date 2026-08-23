import { useEffect, useState } from 'react'
import { Modal } from '@renderer/components/ui/modal'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Button } from '@renderer/components/ui/button'
import type { Customer } from '@shared/types'

export function CustomerPickerModal({
  onClose,
  onSelect
}: {
  onClose: () => void
  onSelect: (customer: Customer | null) => void
}): React.JSX.Element {
  const [results, setResults] = useState<Customer[]>([])

  useEffect(() => {
    void window.pos.catalog.listCustomers().then(setResults)
  }, [])

  return (
    <Modal open onClose={onClose} title="Select customer">
      <div className="space-y-3">
        <SearchInput
          autoFocus
          placeholder="Search customers by name or phone..."
          onSearch={(q) => {
            if (!q) return void window.pos.catalog.listCustomers().then(setResults)
            void window.pos.catalog.searchCustomers(q).then(setResults)
          }}
        />
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            onSelect(null)
            onClose()
          }}
        >
          Walk-in customer
        </Button>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c)
                onClose()
              }}
              className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-muted"
            >
              <span className="text-sm font-medium">{c.name}</span>
              {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
