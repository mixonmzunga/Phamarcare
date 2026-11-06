'use client'

import { create } from 'zustand'

export type ViewKey =
  | 'dashboard' | 'medicines' | 'inventory' | 'pos' | 'sales'
  | 'purchases' | 'customers' | 'suppliers' | 'returns'
  | 'accounts' | 'reports' | 'employees' | 'services' | 'expenses'
  | 'notifications' | 'users' | 'settings' | 'backup'

interface NavState {
  view: ViewKey
  params: Record<string, any>
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  setView: (view: ViewKey, params?: Record<string, any>) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  toggleMobileNav: () => void
}

export const useNav = create<NavState>((set) => ({
  view: 'dashboard',
  params: {},
  sidebarCollapsed: false,
  mobileNavOpen: false,
  setView: (view, params = {}) => set({ view, params, mobileNavOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
}))
