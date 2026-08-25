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
  ReceiptText,
  Undo2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PERMISSIONS } from './navPermissions'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  permission?: string
  feature?: string
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

/**
 * Mirrors post_software_web/src/config/navigation.ts exactly — same items,
 * same grouping, same order — per the master product rule that Web and
 * Desktop are two platform faces of ONE product, not two different navs.
 * Only the icon for "Sales History"/"Expenses" duplicate (Receipt) is kept
 * as-is to match the web app's own choice, not an oversight here.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.dashboardView },
      { label: 'POS', to: '/pos', icon: ShoppingCart, permission: PERMISSIONS.salesCreate, feature: 'pos' }
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Sales History', to: '/sales', icon: ReceiptText, permission: PERMISSIONS.salesView },
      { label: 'Returns', to: '/returns', icon: Undo2, permission: PERMISSIONS.returnsView }
    ]
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: PERMISSIONS.productsView },
      { label: 'Inventory', to: '/inventory', icon: Boxes, permission: PERMISSIONS.inventoryView }
    ]
  },
  {
    label: 'Relationships',
    items: [
      { label: 'Customers', to: '/customers', icon: Users, permission: PERMISSIONS.customersView },
      { label: 'Suppliers', to: '/suppliers', icon: Truck, permission: PERMISSIONS.suppliersView }
    ]
  },
  {
    label: 'Purchasing',
    items: [
      { label: 'Purchases', to: '/purchases', icon: ShoppingBag, permission: PERMISSIONS.purchasesView },
      { label: 'Expenses', to: '/expenses', icon: Receipt, permission: PERMISSIONS.expensesView }
    ]
  },
  {
    label: 'Insights',
    items: [{ label: 'Reports', to: '/reports', icon: BarChart3, permission: PERMISSIONS.reportsView, feature: 'reports' }]
  },
  {
    label: 'Business',
    items: [
      { label: 'Employees', to: '/employees', icon: UserCog, permission: PERMISSIONS.usersView },
      { label: 'Branches', to: '/branches', icon: Building2, permission: PERMISSIONS.businessesView }
    ]
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Subscription', to: '/subscription', icon: CreditCard }
    ]
  }
]
