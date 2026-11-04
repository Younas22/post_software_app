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
  Undo2,
  CalendarClock,
  HandCoins
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HideableModule, OptionalModule, Terminology } from '@shared/types'
import { PERMISSIONS } from './navPermissions'

/** Fixed text, or derived from the business type's terminology ("Patients", "Menu", "Orders"). */
export type NavLabel = string | ((t: Terminology) => string)

export interface NavItem {
  label: NavLabel
  to: string
  icon: LucideIcon
  permission?: string
  feature?: string
  /** Hidden when the business type hides this module (Admin → Business Types → Modules). */
  hideable?: HideableModule
  /** Only shown when the business type switches this optional module on. */
  module?: OptionalModule
}

export interface NavGroup {
  label?: NavLabel
  items: NavItem[]
}

export interface ResolvedNavItem extends Omit<NavItem, 'label'> {
  label: string
}

export interface ResolvedNavGroup {
  label?: string
  items: ResolvedNavItem[]
}

/**
 * Mirrors post_software_web/src/config/navigation.ts — same items, grouping,
 * terminology-driven labels and module switches — so Web and Desktop stay
 * two faces of ONE product.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.dashboardView },
      { label: (t) => t.pos, to: '/pos', icon: ShoppingCart, permission: PERMISSIONS.salesCreate, feature: 'pos' }
    ]
  },
  {
    label: 'Installments',
    items: [
      { label: 'Installment Plans', to: '/installments', icon: CalendarClock, permission: PERMISSIONS.installmentsView, module: 'installments' },
      { label: 'Collections', to: '/collections', icon: HandCoins, permission: PERMISSIONS.installmentsView, module: 'installments' }
    ]
  },
  {
    label: (t) => t.sales,
    items: [
      { label: (t) => (t.sales === 'Sales' ? 'Sales History' : t.sales), to: '/sales', icon: ReceiptText, permission: PERMISSIONS.salesView },
      { label: 'Returns', to: '/returns', icon: Undo2, permission: PERMISSIONS.returnsView, hideable: 'returns' }
    ]
  },
  {
    label: 'Catalog',
    items: [
      { label: (t) => t.products, to: '/products', icon: Package, permission: PERMISSIONS.productsView },
      { label: (t) => t.inventory, to: '/inventory', icon: Boxes, permission: PERMISSIONS.inventoryView, hideable: 'inventory' }
    ]
  },
  {
    label: 'Relationships',
    items: [
      { label: (t) => t.customers, to: '/customers', icon: Users, permission: PERMISSIONS.customersView },
      { label: (t) => t.suppliers, to: '/suppliers', icon: Truck, permission: PERMISSIONS.suppliersView, hideable: 'suppliers' }
    ]
  },
  {
    label: 'Money',
    items: [
      { label: (t) => t.purchases, to: '/purchases', icon: ShoppingBag, permission: PERMISSIONS.purchasesView, hideable: 'purchases' },
      { label: 'Expenses', to: '/expenses', icon: Receipt, permission: PERMISSIONS.expensesView, hideable: 'expenses' }
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

export function resolveLabel(label: NavLabel, terms: Terminology): string {
  return typeof label === 'function' ? label(terms) : label
}
