import { useAppStore } from '@renderer/lib/stores/appStore'
import { setFormatCurrency, setFormatTimeZone } from '@renderer/lib/format'
import type { BusinessInfo } from '@shared/types'

/**
 * Applies the business profile everywhere the renderer depends on it: the
 * app store (sidebar/topbar branding), money & date formatting, and the
 * window title.
 */
export function applyBusinessContext(business: BusinessInfo | null): void {
  useAppStore.getState().setBusiness(business)
  if (!business) return
  setFormatCurrency(business.currency)
  setFormatTimeZone(business.timezone)
  document.title = business.name
}

/** Re-fetch the business (incl. logo) from the server and apply it; no-op offline. */
export async function refreshBusinessContext(): Promise<void> {
  try {
    const business = await window.pos.context.refreshBusiness()
    if (business) applyBusinessContext(business)
  } catch {
    // Branding/profile refresh is best-effort.
  }
}
