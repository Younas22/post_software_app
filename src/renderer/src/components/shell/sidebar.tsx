import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { NAV_GROUPS } from '@renderer/lib/navigation'

export function Sidebar(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const { hasPermission } = useAuthStore()
  const { hasFeature } = useAppStore()

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.permission && !hasPermission(item.permission)) return false
      if (item.feature && !hasFeature(item.feature)) return false
      return true
    })
  })).filter((group) => group.items.length > 0)

  return (
    <aside
      className={cn(
        // w-60 matches post_software_web's Sidebar width exactly (icon
        // consistency/navigation-parity requirement) — collapsed width is a
        // desktop-only affordance web has no equivalent of (no room concern
        // in a browser tab), kept as a platform-appropriate addition.
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width]',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
          P
        </div>
        {!collapsed && <span className="truncate text-base font-semibold">Universal POS</span>}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Primary">
        {visibleGroups.map((group, i) => (
          <div key={i}>
            {group.label && !collapsed && (
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-soft text-brand' : 'text-sidebar-foreground/80 hover:bg-muted hover:text-foreground'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 border-t border-sidebar-border px-5 py-3.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && 'Collapse'}
      </button>
    </aside>
  )
}
