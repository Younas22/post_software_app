import { forwardRef, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from './input'

interface SearchInputProps {
  value?: string
  placeholder?: string
  autoFocus?: boolean
  onSearch: (value: string) => void
  debounceMs?: number
  className?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value: controlled, placeholder = 'Search...', autoFocus, onSearch, debounceMs = 300, className }, ref) => {
    const [value, setValue] = useState(controlled ?? '')
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      if (controlled !== undefined) setValue(controlled)
    }, [controlled])

    return (
      <div className={`relative ${className ?? ''}`}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          className="pl-9"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            const next = e.target.value
            setValue(next)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => onSearch(next), debounceMs)
          }}
        />
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'
