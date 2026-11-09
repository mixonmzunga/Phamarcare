'use client'

import { create } from 'zustand'

export interface CartItem {
  medicineId: string
  name: string
  image?: string | null
  price: number
  qty: number
  stock: number
  discountPercent: number
  vatPercent: number
  prescription: boolean
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  updateQty: (id: string, delta: number) => void
  setQty: (id: string, val: number) => void
  setPrice: (id: string, val: number) => void
  removeItem: (id: string) => void
  clear: () => void
  setItems: (items: CartItem[]) => void
  totalQty: () => number
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => {
    set((s) => {
      const ex = s.items.find((x) => x.medicineId === item.medicineId)
      if (ex) {
        if (ex.qty + 1 > item.stock) return s
        return { items: s.items.map((x) => x.medicineId === item.medicineId ? { ...x, qty: x.qty + 1 } : x) }
      }
      return { items: [...s.items, item] }
    })
  },
  updateQty: (id, delta) => {
    set((s) => ({
      items: s.items.map((x) => {
        if (x.medicineId !== id) return x
        const q = x.qty + delta
        if (q <= 0) return x
        if (q > x.stock) return x
        return { ...x, qty: q }
      }),
    }))
  },
  setQty: (id, val) => {
    set((s) => ({
      items: s.items.map((x) => x.medicineId === id ? { ...x, qty: Math.min(Math.max(1, val), x.stock) } : x),
    }))
  },
  setPrice: (id, val) => {
    set((s) => ({
      items: s.items.map((x) => x.medicineId === id ? { ...x, price: Math.max(0, val) } : x),
    }))
  },
  removeItem: (id) => set((s) => ({ items: s.items.filter((x) => x.medicineId !== id) })),
  clear: () => set({ items: [] }),
  setItems: (items) => set({ items }),
  totalQty: () => get().items.reduce((s, x) => s + x.qty, 0),
}))
