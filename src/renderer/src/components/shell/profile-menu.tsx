import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Camera, ChevronDown, CreditCard, FileClock, LogOut, Monitor, Moon, Settings, Sun, User as UserIcon } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useThemeStore, type ThemeChoice } from '@renderer/lib/stores/themeStore'
import { useRemoteImage } from '@renderer/lib/use-branding'
import { UserAvatar } from '@renderer/components/ui/user-avatar'

const THEMES: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
]

/** Top-right account menu — same design as the web app: identity, quick links, appearance, sign out. */
export function ProfileMenu(): React.JSX.Element | null {
  const navigate = useNavigate()
  const { user, setSession } = useAuthStore()
  const business = useAppStore((s) => s.business)
  const { theme, setTheme } = useThemeStore()
  const avatar = useRemoteImage(user?.avatar_url)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const role = user.is_super_admin ? 'Super Admin' : user.roles[0]?.replace(/-/g, ' ')
  const go = (to: string): void => {
    setOpen(false)
    navigate(to)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('group flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted', open && 'bg-muted')}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <UserAvatar name={user.name} src={avatar} size="md" className="ring-2 ring-background" />
        <span className="max-w-32 truncate text-sm font-medium">{user.name.split(' ')[0]}</span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center gap-3 border-b border-border bg-muted/50 p-4">
            <button onClick={() => go('/settings/account')} className="relative shrink-0 rounded-full" aria-label="Change profile photo">
              <UserAvatar name={user.name} src={avatar} size="lg" />
              <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-popover bg-brand text-brand-foreground">
                <Camera className="size-2.5" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {role && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium capitalize text-brand">{role}</span>}
                {business?.name && (
                  <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Building2 className="size-3 shrink-0" />
                    <span className="truncate">{business.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <MenuLink icon={UserIcon} label="My profile" hint="Photo, name & password" onClick={() => go('/settings/account')} />
            <MenuLink icon={Settings} label="Settings" hint="Business, printer & sync" onClick={() => go('/settings')} />
            <MenuLink icon={CreditCard} label="Subscription" hint="Plan & usage" onClick={() => go('/subscription')} />
            <MenuLink icon={FileClock} label="Sync status" hint="Pending sales & conflicts" onClick={() => go('/settings/sync')} />
          </div>

          <div className="border-t border-border p-3">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors',
                      active ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="size-[18px]" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border p-1.5">
            <button
              onClick={async () => {
                setOpen(false)
                await window.pos.auth.logout()
                setSession(null)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error-soft"
            >
              <LogOut className="size-[18px]" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuLink({ icon: Icon, label, hint, onClick }: { icon: typeof Sun; label: string; hint: string; onClick: () => void }): React.JSX.Element {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}
