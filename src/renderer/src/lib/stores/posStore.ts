import { create } from 'zustand'
import type { Customer, Product } from '@shared/types'

export interface CartLine {
  product: Product
  quantity: number
  discount: number
}

interface PosState {
  lines: CartLine[]
  customer: Customer | null
  clientTransactionId: string | null
  addProduct(product: Product): void
  updateQuantity(productId: number, quantity: number): void
  updateDiscount(productId: number, discount: number): void
  removeLine(productId: number): void
  setCustomer(customer: Customer | null): void
  ensureTransactionId(): string
  clear(): void
  subtotal(): number
  totalDiscount(): number
  totalTax(): number
  total(): number
}

export const usePosStore = create<PosState>((set, get) => ({
  lines: [],
  customer: null,
  clientTransactionId: null,

  addProduct: (product) =>
    set((state) => {
      const existing = state.lines.find((l) => l.product.id === product.id)
      if (existing) {
        return { lines: state.lines.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l)) }
      }
      return { lines: [...state.lines, { product, quantity: 1, discount: 0 }] }
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.product.id !== productId)
          : state.lines.map((l) => (l.product.id === productId ? { ...l, quantity } : l))
    })),

  updateDiscount: (productId, discount) =>
    set((state) => ({ lines: state.lines.map((l) => (l.product.id === productId ? { ...l, discount } : l)) })),

  removeLine: (productId) => set((state) => ({ lines: state.lines.filter((l) => l.product.id !== productId) })),

  setCustomer: (customer) => set({ customer }),

  ensureTransactionId: () => {
    const existing = get().clientTransactionId
    if (existing) return existing
    const id = crypto.randomUUID()
    set({ clientTransactionId: id })
    return id
  },

  clear: () => set({ lines: [], customer: null, clientTransactionId: null }),

  subtotal: () => get().lines.reduce((sum, l) => sum + l.product.sale_price * l.quantity, 0),
  totalDiscount: () => get().lines.reduce((sum, l) => sum + l.discount, 0),
  totalTax: () =>
    get().lines.reduce((sum, l) => {
      const lineSubtotal = l.product.sale_price * l.quantity - l.discount
      const rate = l.product.tax_rate ?? 0
      return sum + Math.max(lineSubtotal, 0) * (rate / 100)
    }, 0),
  total: () => {
    const s = get()
    return s.subtotal() - s.totalDiscount() + s.totalTax()
  }
}))
