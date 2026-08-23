import { cn } from '@renderer/lib/cn'

export interface TabItem {
  value: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
}

export function Tabs({ items, value, onChange }: TabsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
            value === item.value
              ? 'border-brand text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
