import { create } from 'zustand'
import type { BranchInfo, BusinessInfo, DeviceStatus } from '@shared/types'

/**
 * Mirrors the REAL `GET /api/v1/subscription` response exactly (see
 * BACKEND_EXTENSIONS.md) — nested under `subscription`/`package`/`usage`,
 * confirmed against the live backend, not assumed from the endpoint name.
 */
export interface SubscriptionInfo {
  client: { id: number; name: string; status: string }
  subscription: {
    id: number
    status: string
    effective_status: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'
    trial_ends_at: string | null
    starts_at: string
    ends_at: string | null
    cancelled_at: string | null
  }
  package: {
    id: number
    name: string
    slug: string
    price: string
    /** ISO code package prices are charged in (platform default currency). */
    currency?: string
    billing_cycle: string
    max_businesses: number | null
    max_branches: number | null
    max_users: number | null
    max_devices: number | null
    features: string[]
  }
  usage: {
    users: { used: number; limit: number | null }
    branches: { used: number; limit: number | null }
    devices: { used: number; limit: number | null }
  }
}

interface AppState {
  business: BusinessInfo | null
  branch: (BranchInfo & { id: number }) | null
  features: string[]
  device: DeviceStatus | null
  subscription: SubscriptionInfo | null
  setBusiness(business: BusinessInfo | null): void
  setBranch(branch: (BranchInfo & { id: number }) | null): void
  setFeatures(features: string[]): void
  setDevice(device: DeviceStatus | null): void
  setSubscription(subscription: SubscriptionInfo | null): void
  hasFeature(slug: string): boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  business: null,
  branch: null,
  features: [],
  device: null,
  subscription: null,
  setBusiness: (business) => set({ business }),
  setBranch: (branch) => set({ branch }),
  setFeatures: (features) => set({ features }),
  setDevice: (device) => set({ device }),
  setSubscription: (subscription) => set({ subscription }),
  hasFeature: (slug) => get().features.includes(slug)
}))
