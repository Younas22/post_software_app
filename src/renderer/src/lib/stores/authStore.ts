import { create } from 'zustand'
import type { AuthUser } from '@shared/types'

interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in'
  user: AuthUser | null
  setSession(user: AuthUser | null): void
  hasPermission(slug: string): boolean
  hasAnyPermission(slugs: string[]): boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  setSession: (user) => set({ user, status: user ? 'signed-in' : 'signed-out' }),
  hasPermission: (slug) => {
    const user = get().user
    if (!user) return false
    return user.is_super_admin || user.permissions.includes(slug)
  },
  hasAnyPermission: (slugs) => {
    const user = get().user
    if (!user) return false
    return user.is_super_admin || slugs.some((s) => user.permissions.includes(s))
  }
}))
