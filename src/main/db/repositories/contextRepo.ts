import { getDb } from '../index'
import { getSetting, setSetting } from './syncMetaRepo'
import type { AuthUser, BranchInfo, BusinessInfo } from '@shared/types'

/** Single-row caches for the device's own business/branch/user context. */

export function saveBusiness(business: BusinessInfo): void {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO business (id, name, currency, timezone, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, currency=excluded.currency, timezone=excluded.timezone, updated_at=excluded.updated_at`
    )
    .run(business.id, business.name, business.currency, business.timezone, now)
}

export function getCachedBusiness(): BusinessInfo | null {
  const row = getDb().prepare('SELECT id, name, currency, timezone FROM business LIMIT 1').get() as
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

export function saveUser(user: AuthUser): void {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO app_user (id, name, email, business_id, branch_id, roles, permissions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, business_id=excluded.business_id, branch_id=excluded.branch_id, roles=excluded.roles, permissions=excluded.permissions, updated_at=excluded.updated_at`
    )
    .run(user.id, user.name, user.email, user.business_id, user.branch_id, JSON.stringify(user.roles), JSON.stringify(user.permissions), now)
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
      }
    | undefined
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
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
      }
    | undefined
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    is_super_admin: false,
    status: 'active',
    client_id: null,
    business_id: row.business_id,
    branch_id: row.branch_id,
    roles: JSON.parse(row.roles) as string[],
    permissions: JSON.parse(row.permissions) as string[]
  }
}
