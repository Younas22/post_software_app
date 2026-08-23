import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingBag,
  Receipt,
  BarChart3,
  UserCog,
  Building2,
  Settings,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { PERMISSIONS } from '@renderer/lib/navPermissions'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  permission?: string
  feature?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.dashboardView },
  { to: '/pos', label: 'POS', icon: ShoppingCart, permission: PERMISSIONS.salesCreate, feature: 'pos' },
  { to: '/sales', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.salesView },
  { to: '/returns', label: 'Returns', icon: RotateCcw, permission: PERMISSIONS.returnsView },
  { to: '/products', label: 'Products', icon: Package, permission: PERMISSIONS.productsView },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: PERMISSIONS.inventoryView },
  { to: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.customersView },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, permission: PERMISSIONS.suppliersView },
  { to: '/purchases', label: 'Purchases', icon: ShoppingBag, permission: PERMISSIONS.purchasesView },
  { to: '/expenses', label: 'Expenses', icon: Receipt, permission: PERMISSIONS.expensesView },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: PERMISSIONS.reportsView, feature: 'reports' },
  { to: '/employees', label: 'Employees', icon: UserCog, permission: PERMISSIONS.usersView },
  { to: '/branches', label: 'Branches', icon: Building2, permission: PERMISSIONS.businessesView },
  { to: '/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const { hasPermission } = useAuthStore()
  const { hasFeature } = useAppStore()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false
    if (item.feature && !hasFeature(item.feature)) return false
    return true
  })

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width]',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
          P
        </div>
        {!collapsed && <span className="truncate text-sm font-semibold">Universal POS</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-soft text-brand' : 'text-sidebar-foreground/80 hover:bg-muted hover:text-foreground'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && 'Collapse'}
      </button>
    </aside>
  )
}
