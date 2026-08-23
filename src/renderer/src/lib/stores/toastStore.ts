import { create } from 'zustand'

export interface ToastItem {
  id: string
  variant: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
}

interface ToastState {
  toasts: ToastItem[]
  push(toast: Omit<ToastItem, 'id'>): void
  dismiss(id: string): void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 5000)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))

export function toast(toast: Omit<ToastItem, 'id'>): void {
  useToastStore.getState().push(toast)
}
