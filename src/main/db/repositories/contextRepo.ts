import { getDb } from '../index'
import { getSetting, setSetting } from './syncMetaRepo'
import type { AuthUser, BranchInfo, BusinessInfo, BusinessTypeBranding } from '@shared/types'

/** Single-row caches for the device's own business/branch/user context. */

export function saveBusiness(business: BusinessInfo): void {
  const now = new Date().toISOString()
  const logoUrl = business.logo_url ?? null
  getDb()
    .prepare(
      // logo_data is only kept while logo_url is unchanged — a new/removed
      // logo invalidates the cached copy (see cacheBusinessLogo()).
      `INSERT INTO business (id, name, currency, timezone, logo_url, logo_data, favicon_url, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, currency=excluded.currency, timezone=excluded.timezone,
         logo_data=CASE WHEN business.logo_url IS excluded.logo_url THEN business.logo_data ELSE NULL END,
         logo_url=excluded.logo_url, favicon_url=excluded.favicon_url, updated_at=excluded.updated_at`
    )
    .run(business.id, business.name, business.currency, business.timezone, logoUrl, business.favicon_url ?? null, now)
}

export function saveBusinessLogoData(businessId: number, logoUrl: string, dataUri: string): void {
  getDb().prepare('UPDATE business SET logo_data = ? WHERE id = ? AND logo_url = ?').run(dataUri, businessId, logoUrl)
}

export function getCachedBusiness(): BusinessInfo | null {
  const row = getDb().prepare('SELECT id, name, currency, timezone, logo_url, logo_data, favicon_url FROM business LIMIT 1').get() as
    | BusinessInfo
    | undefined
  return row ?? null
}

export function saveBranch(branch: BranchInfo & { id: number }): void {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO branch (id, name, address, phone, is_main, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, address=excluded.address, phone=excluded.phone, is_main=excluded.is_main, updated_at=excluded.updated_at`
    )
    .run(branch.id, branch.name, branch.address ?? null, branch.phone ?? null, branch.is_main ? 1 : 0, now)
}

interface BranchRow {
  id: number
  name: string
  address: string | null
  phone: string | null
  is_main: number
}

export function getCachedBranch(): (BranchInfo & { id: number }) | null {
  const row = getDb().prepare('SELECT id, name, address, phone, is_main FROM branch LIMIT 1').get() as BranchRow | undefined
  if (!row) return null
  return { id: row.id, name: row.name, address: row.address, phone: row.phone, is_main: !!row.is_main }
}

/**
 * `business`/`branch` are meant to hold exactly one row each (see the
 * "Single-row caches" note above), but saveBusiness()/saveBranch() only
 * REPLACE a row when its id matches — if this device registers against a
 * different business/branch than whatever it last cached, the old row is
 * never removed, `ON CONFLICT(id)` just leaves it in place alongside a new
 * one, and getCachedBusiness()/getCachedBranch()'s unordered `LIMIT 1` can
 * then return either one. Called from deviceManager.register() (alongside
 * resetCachedCatalog) so every re-registration starts from a clean slate;
 * runInitialSync() re-populates both immediately afterward.
 */
export function resetCachedContext(): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM business').run()
    db.prepare('DELETE FROM branch').run()
  })
  tx()
}

export function saveUser(user: AuthUser): void {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO app_user (id, name, email, business_id, branch_id, roles, permissions, avatar_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, business_id=excluded.business_id, branch_id=excluded.branch_id, roles=excluded.roles, permissions=excluded.permissions, avatar_url=excluded.avatar_url, updated_at=excluded.updated_at`
    )
    .run(
      user.id,
      user.name,
      user.email,
      user.business_id,
      user.branch_id,
      JSON.stringify(user.roles),
      JSON.stringify(user.permissions),
      user.avatar_url ?? null,
      now
    )
}

/** Exactly one app_user row is ever cached per installation's active session. */
export function getSingleCachedUser(): AuthUser | null {
  const row = getDb().prepare('SELECT * FROM app_user ORDER BY rowid DESC LIMIT 1').get() as
    | {
        id: number
        name: string
        email: string
        business_id: number | null
        branch_id: number | null
        roles: string
        permissions: string
        avatar_url: string | null
      }
    | undefined
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url ?? null,
    is_super_admin: false,
    status: 'active',
    client_id: null,
    business_id: row.business_id,
    branch_id: row.branch_id,
    roles: JSON.parse(row.roles) as string[],
    permissions: JSON.parse(row.permissions) as string[]
  }
}

const FEATURES_KEY = 'enabled_features'

export function saveFeatures(features: string[]): void {
  setSetting(FEATURES_KEY, JSON.stringify(features))
}

export function getCachedFeatures(): string[] {
  const raw = getSetting(FEATURES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function getCachedUser(userId: number): AuthUser | null {
  const row = getDb().prepare('SELECT * FROM app_user WHERE id = ?').get(userId) as
    | {
        id: number
        name: string
        email: string
        business_id: number | null
        branch_id: number | null
        roles: string
        permissions: string
        avatar_url: string | null
      }
    | undefined
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url ?? null,
    is_super_admin: false,
    status: 'active',
    client_id: null,
    business_id: row.business_id,
    branch_id: row.branch_id,
    roles: JSON.parse(row.roles) as string[],
    permissions: JSON.parse(row.permissions) as string[]
  }
}

const BUSINESS_TYPE_KEY = 'business_type_branding'

/** The business type's theme/terminology/modules from GET /config — cached so the app (and its login screen) look right offline. */
export function saveBusinessType(branding: BusinessTypeBranding | null | undefined): void {
  setSetting(BUSINESS_TYPE_KEY, branding ? JSON.stringify(branding) : '')
}

export function getCachedBusinessType(): BusinessTypeBranding | null {
  const raw = getSetting(BUSINESS_TYPE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BusinessTypeBranding
  } catch {
    return null
  }
}
