import type { BrandTheme, BusinessTypeBranding, SidebarStyle, Terminology } from '@shared/types'

/**
 * Per-business-type branding — the same system as the web app
 * (post_software_web/src/lib/branding.ts): the one Universal POS re-skins and
 * re-words itself for each trade. Data comes from GET /config → business_type,
 * cached in SQLite by main so it also applies offline and on the login screen.
 */

export const DEFAULT_TERMS: Terminology = {
  customer: 'Customer',
  customers: 'Customers',
  product: 'Product',
  products: 'Products',
  sale: 'Sale',
  sales: 'Sales',
  supplier: 'Supplier',
  suppliers: 'Suppliers',
  purchase: 'Purchase',
  purchases: 'Purchases',
  category: 'Category',
  categories: 'Categories',
  inventory: 'Inventory',
  pos: 'POS'
}

export const DEFAULT_BRAND_COLOR = '#00bf63'

export const DEFAULT_THEME: BrandTheme = {
  primary_color: DEFAULT_BRAND_COLOR,
  sidebar_style: 'light',
  login_headline: 'Run your business from one place',
  login_tagline: 'Sales, stock, customers and reports — all in one fast, simple POS.',
  login_highlights: ['Lightning-fast checkout', 'Works offline, syncs automatically', 'Reports that make sense'],
  login_image_url: null
}

export function resolveTerms(branding?: BusinessTypeBranding | null): Terminology {
  return { ...DEFAULT_TERMS, ...(branding?.terminology ?? {}) }
}

export function resolveTheme(branding?: BusinessTypeBranding | null): BrandTheme {
  return { ...DEFAULT_THEME, ...(branding?.theme ?? {}) }
}

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
}

function mix(color: RGB, target: RGB, amount: number): RGB {
  return [0, 1, 2].map((i) => color[i] + (target[i] - color[i]) * amount) as RGB
}

function luminance([r, g, b]: RGB): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]

/** CSS custom properties consumed by globals.css (--brand, --brand-hover, ...). */
export function brandCssVars(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex) ?? hexToRgb(DEFAULT_BRAND_COLOR)!
  const fg = luminance(rgb) > 0.45 ? '#111111' : '#ffffff'
  return {
    '--brand': rgbToHex(rgb),
    '--brand-hover': rgbToHex(mix(rgb, BLACK, 0.1)),
    '--brand-active': rgbToHex(mix(rgb, BLACK, 0.2)),
    '--brand-fg': fg,
    '--brand-soft': rgbToHex(mix(rgb, WHITE, 0.9)),
    '--brand-soft-dark': rgbToHex(mix(rgb, BLACK, 0.78)),
    '--brand-deep': rgbToHex(mix(rgb, BLACK, 0.45))
  }
}

const VAR_NAMES = Object.keys(brandCssVars(DEFAULT_BRAND_COLOR))

/** Paints the brand colour + sidebar style onto <html>; null resets to the platform default. */
export function applyBrandTheme(theme: Pick<BrandTheme, 'primary_color' | 'sidebar_style'> | null): void {
  const root = document.documentElement
  if (!theme) {
    VAR_NAMES.forEach((name) => root.style.removeProperty(name))
    root.removeAttribute('data-sidebar')
    return
  }
  const vars = brandCssVars(theme.primary_color || DEFAULT_BRAND_COLOR)
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value))
  const sidebar: SidebarStyle = theme.sidebar_style ?? 'light'
  root.setAttribute('data-sidebar', sidebar)
}

/** Digits for wa.me links — a local Pakistani "0300 1234567" becomes "923001234567". */
export function phoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `92${digits.slice(1)}`
  return digits
}

export function telHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, '')}`
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? 'P') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}
