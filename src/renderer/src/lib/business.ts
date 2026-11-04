import { useAppStore } from '@renderer/lib/stores/appStore'
import { setFormatCurrency, setFormatTimeZone } from '@renderer/lib/format'
import { applyBrandTheme } from '@renderer/lib/branding'
import type { BusinessInfo, BusinessTypeBranding } from '@shared/types'

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

/**
 * The business type's colour + sidebar style (Admin → Business Types),
 * applied to the whole window — the login screen included, from the cache
 * of whichever business last signed in on this device.
 */
export function applyBusinessType(businessType: BusinessTypeBranding | null): void {
  useAppStore.getState().setBusinessType(businessType)
  applyBrandTheme(
    businessType ? { primary_color: businessType.theme.primary_color, sidebar_style: businessType.theme.sidebar_style } : null
  )
}

/**
 * Window/taskbar icon = the business's favicon, else its logo (Windows/Linux;
 * macOS keeps the bundle icon). Best-effort, never throws.
 */
export async function applyWindowIcon(business: BusinessInfo | null): Promise<void> {
  try {
    const url = business?.favicon_url ?? business?.logo_url ?? null
    const data = url ? await window.pos.media.fetchImage(url) : null
    await window.pos.window.setIcon(data ?? business?.logo_data ?? null)
  } catch {
    // cosmetic only
  }
}

/** Re-fetch the business (incl. logo + business type) from the server and apply it; no-op offline. */
export async function refreshBusinessContext(): Promise<void> {
  try {
    const business = await window.pos.context.refreshBusiness()
    if (business) applyBusinessContext(business)
    const context = await window.pos.context.get()
    applyBusinessType(context.businessType)
    void applyWindowIcon(business ?? context.business)
  } catch {
    // Branding/profile refresh is best-effort.
  }
}
