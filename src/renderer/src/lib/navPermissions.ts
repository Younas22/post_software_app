/**
 * Real permission slugs from the Laravel backend (see
 * post_software_web/docs/LARAVEL_API_DISCOVERY.md §12) — never invented.
 * Nav items are gated on these, but this is UX-only; Laravel remains the
 * authorization authority on every request either way (Phase 12 rule).
 */
export const PERMISSIONS = {
  dashboardView: 'dashboard.view',
  productsView: 'products.view',
  inventoryView: 'inventory.view',
  customersView: 'customers.view',
  suppliersView: 'suppliers.view',
  purchasesView: 'purchases.view',
  expensesView: 'expenses.view',
  salesView: 'sales.view',
  salesCreate: 'sales.create',
  returnsView: 'returns.view',
  reportsView: 'reports.view',
  usersView: 'users.view',
  businessesView: 'businesses.view',
  settingsView: 'settings.view',
  subscriptionsView: 'subscriptions.view',
  installmentsView: 'installments.view',
  installmentsCreate: 'installments.create',
  installmentsCollect: 'installments.collect',
  installmentsCancel: 'installments.cancel',
  customersCreate: 'customers.create',
  productsCreate: 'products.create'
} as const
