import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, LifeBuoy, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { NAV_GROUPS, resolveLabel, type ResolvedNavGroup } from '@renderer/lib/navigation'
import { PERMISSIONS } from '@renderer/lib/navPermissions'
import { useBranding, usePlatformInfo, useRemoteImage } from '@renderer/lib/use-branding'
import { initials } from '@renderer/lib/branding'

const COLLAPSE_KEY = 'pos_sidebar_collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Permission/feature/module-filtered nav, renamed in the business type's own words. */
export function useVisibleNav(): ResolvedNavGroup[] {
  const { hasPermission } = useAuthStore()
  const { hasFeature } = useAppStore()
  // The store getters above are stable functions — depend on the data they read.
  const user = useAuthStore((s) => s.user)
  const features = useAppStore((s) => s.features)
  const { terms, hasModule, isHidden } = useBranding()

  return useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        label: group.label ? resolveLabel(group.label, terms) : undefined,
        items: group.items
          .filter(
            (item) =>
              (!item.permission || hasPermission(item.permission)) &&
              (!item.feature || hasFeature(item.feature)) &&
              (!item.hideable || !isHidden(item.hideable)) &&
              (!item.module || hasModule(item.module))
          )
          .map((item) => ({ ...item, label: resolveLabel(item.label, terms) }))
      })).filter((group) => group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission, hasFeature, terms, hasModule, isHidden, user, features]
  )
}

/**
 * Desktop sidebar: the business's own brand (+ its trade), a primary quick
 * action, large nav buttons in the trade's own words, and a pinned "Help &
 * Support" card carrying the POS company's logo. Collapses to an icon rail.
 */
export function Sidebar(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)
  const groups = useVisibleNav()
  const business = useAppStore((s) => s.business)
  const { typeName } = useBranding()
  const brandName = business?.name ?? 'Universal POS'
  const logo = business?.logo_data ?? null

  const toggle = (): void => {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !prev
    })
  }

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-[84px]' : 'w-[276px]'
      )}
    >
      <div className={cn('flex h-[72px] shrink-0 items-center gap-3', collapsed ? 'justify-center px-2' : 'px-5')} title={brandName}>
        {logo ? (
          <img src={logo} alt="" className="size-10 shrink-0 rounded-xl border border-black/5 bg-white object-contain p-0.5 shadow-xs" />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-brand-foreground shadow-xs ring-1 ring-black/5">
            {initials(brandName)}
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold">{brandName}</p>
            {typeName && <p className="truncate text-xs text-sidebar-muted">{typeName}</p>}
          </div>
        )}
      </div>

      <QuickAction collapsed={collapsed} />

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-2" aria-label="Primary">
        {groups.map((group, i) => (
          <div key={i}>
            {group.label &&
              (collapsed ? (
                <div className="mx-auto mb-2 h-px w-8 bg-sidebar-border" aria-hidden />
              ) : (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">{group.label}</p>
              ))}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/installments'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex h-11 items-center gap-3 rounded-xl text-[15px] font-medium transition-all duration-150',
                      collapsed ? 'mx-auto w-12 justify-center' : 'px-3.5',
                      isActive
                        ? 'bg-sidebar-active text-sidebar-active-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                    )
                  }
                >
                  <item.icon className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-sidebar-border p-3', collapsed && 'flex flex-col items-center gap-2')}>
        <SupportCard collapsed={collapsed} />
        <button
          onClick={toggle}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg text-xs font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground',
            collapsed ? 'size-10' : 'mt-2 h-8 w-full'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : undefined}
        >
          {collapsed ? <ChevronsRight className="size-[18px]" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && 'Collapse sidebar'}
        </button>
      </div>
    </aside>
  )
}

function QuickAction({ collapsed }: { collapsed: boolean }): React.JSX.Element | null {
  const { hasPermission } = useAuthStore()
  const { hasFeature } = useAppStore()
  const { terms, hasModule } = useBranding()

  const action =
    hasModule('installments') && hasPermission(PERMISSIONS.installmentsCreate)
      ? { to: '/installments/new', label: 'New Installment Plan' }
      : hasPermission(PERMISSIONS.salesCreate) && hasFeature('pos')
        ? { to: '/pos', label: `Open ${terms.pos}` }
        : null

  if (!action) return null

  return (
    <div className={cn('shrink-0 pb-3', collapsed ? 'flex justify-center px-2' : 'px-4')}>
      <NavLink
        to={action.to}
        title={collapsed ? action.label : undefined}
        className={cn(
          'flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover',
          '[[data-sidebar=brand]_&]:bg-white [[data-sidebar=brand]_&]:text-[var(--brand-deep)] [[data-sidebar=brand]_&]:hover:bg-white/90',
          collapsed ? 'w-11' : 'w-full px-4'
        )}
      >
        <Plus className="size-5 shrink-0" />
        {!collapsed && <span className="truncate">{action.label}</span>}
      </NavLink>
    </div>
  )
}

/** Pinned at the very bottom: Help & Support, with the POS company's own logo and name. */
function SupportCard({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  const { pathname } = useLocation()
  const platform = usePlatformInfo()
  const logo = useRemoteImage(platform?.logo_url)
  const active = pathname === '/support'
  const company = platform?.name || 'Support'

  const mark = (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-black/5">
      {logo ? <img src={logo} alt="" className="size-full object-contain p-1" /> : <LifeBuoy className="size-5 text-brand" />}
      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-success" aria-hidden />
    </span>
  )

  return (
    <NavLink
      to="/support"
      title={collapsed ? 'Help & Support' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-2xl transition-colors',
        collapsed ? 'justify-center p-1' : 'w-full border p-2.5 pr-3',
        !collapsed &&
          (active
            ? 'border-transparent bg-sidebar-active text-sidebar-active-foreground'
            : 'border-sidebar-border bg-sidebar-card text-sidebar-foreground hover:bg-sidebar-hover'),
        collapsed && active && 'bg-sidebar-active'
      )}
    >
      {mark}
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-sm font-semibold">Help &amp; Support</span>
            <span className={cn('block truncate text-xs', active ? 'opacity-80' : 'text-sidebar-muted')}>{company}</span>
          </span>
          <LifeBuoy className={cn('size-[18px] shrink-0 transition-transform group-hover:rotate-45', active ? 'opacity-90' : 'text-sidebar-muted')} />
        </>
      )}
    </NavLink>
  )
}
