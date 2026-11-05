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
  setView: (view: ViewKey, params?: Record<string, any>) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useNav = create<NavState>((set) => ({
  view: 'dashboard',
  params: {},
  sidebarCollapsed: false,
  setView: (view, params = {}) => set({ view, params }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
}))
