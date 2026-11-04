import { cn } from '@renderer/lib/cn'
import { initials } from '@renderer/lib/branding'

const SIZE = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-12 text-base', xl: 'size-24 text-2xl' }

/** Profile photo (a CSP-safe data: URI from useRemoteImage) with an initials fallback. */
export function UserAvatar({
  name,
  src,
  size = 'md',
  className
}: {
  name?: string | null
  src?: string | null
  size?: keyof typeof SIZE
  className?: string
}): React.JSX.Element {
  if (src) {
    return <img src={src} alt={name ?? ''} className={cn('shrink-0 rounded-full bg-muted object-cover', SIZE[size], className)} />
  }
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand', SIZE[size], className)}>
      {initials(name)}
    </div>
  )
}
