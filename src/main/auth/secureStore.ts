import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { scoped } from '../logging/logger'

const log = scoped('secure-store')

/**
 * Encrypted-at-rest local storage for secrets (Sanctum user token, Sanctum
 * device token). Uses Electron's `safeStorage`, which is backed by the OS
 * credential vault (DPAPI on Windows, Keychain on macOS) — the ciphertext
 * is useless outside this machine/user account. Falls back to storing
 * nothing (never plaintext) if the OS vault is unavailable, per the master
 * spec's "never store sensitive credentials in plain text" rule.
 */
interface VaultShape {
  userToken?: string
  deviceToken?: string
}

const VAULT_FILE = (): string => path.join(app.getPath('userData'), 'secure', 'vault.bin')

function readVaultFile(): Buffer | null {
  try {
    return fs.readFileSync(VAULT_FILE())
  } catch {
    return null
  }
}

function writeVaultFile(buf: Buffer): void {
  const dir = path.dirname(VAULT_FILE())
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(VAULT_FILE(), buf, { mode: 0o600 })
}

function loadVault(): VaultShape {
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('OS secure storage unavailable — secrets will not persist across restarts.')
    return {}
  }
  const encrypted = readVaultFile()
  if (!encrypted) return {}
  try {
    const decrypted = safeStorage.decryptString(encrypted)
    return JSON.parse(decrypted) as VaultShape
  } catch (err) {
    log.error('Failed to decrypt local vault — treating as empty.', err)
    return {}
  }
}

function persistVault(vault: VaultShape): void {
  if (!safeStorage.isEncryptionAvailable()) return
  const encrypted = safeStorage.encryptString(JSON.stringify(vault))
  writeVaultFile(encrypted)
}

// In-memory cache so we don't decrypt on every access; the file remains the
// durable source of truth across app restarts.
let cache: VaultShape | null = null

function vault(): VaultShape {
  if (cache === null) cache = loadVault()
  return cache
}

export function getUserToken(): string | null {
  return vault().userToken ?? null
}

export function setUserToken(token: string | null): void {
  const v = vault()
  if (token) v.userToken = token
  else delete v.userToken
  persistVault(v)
}

export function getDeviceToken(): string | null {
  return vault().deviceToken ?? null
}

export function setDeviceToken(token: string | null): void {
  const v = vault()
  if (token) v.deviceToken = token
  else delete v.deviceToken
  persistVault(v)
}

export function clearAll(): void {
  cache = {}
  persistVault({})
}
