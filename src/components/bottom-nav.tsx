'use client'

import { useNav, ViewKey } from '@/lib/store'
import { useAuth } from '@/components/providers'
import { hasPermission } from '@/lib/nav'
import { LayoutDashboard, ShoppingCart, Receipt, Menu as MenuIcon, Package } from 'lucide-react'
import { useCart } from '@/lib/cart-store'

interface BottomNavItem {
  key: ViewKey
  label: string
  icon: any
  permission: string
}

const LEFT_ITEMS: BottomNavItem[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard, permission: 'dashboard.view' },
  { key: 'inventory', label: 'Stock', icon: Package, permission: 'inventory.view' },
]

const RIGHT_ITEMS: BottomNavItem[] = [
  { key: 'sales', label: 'Sales', icon: Receipt, permission: 'sales.view' },
]

const GRADIENT = 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)'

export function BottomNav() {
  const { view, setView, toggleMobileNav } = useNav()
  const { user } = useAuth()
  const role = user?.role || ''
  const cartQty = useCart((s) => s.items.reduce((sum, x) => sum + x.qty, 0))

  const leftItems = LEFT_ITEMS.filter((item) => hasPermission(role, item.permission))
  const rightItems = RIGHT_ITEMS.filter((item) => hasPermission(role, item.permission))
  const posAllowed = hasPermission(role, 'pos.view')

  function renderTab(item: BottomNavItem) {
    const Icon = item.icon
    const active = view === item.key
    return (
      <button
        key={item.key}
        onClick={() => setView(item.key)}
        className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 transition-colors min-w-0"
        style={{ color: active ? '#2F6BFF' : '#94a3b8' }}
      >
        <span
          className="flex items-center justify-center mb-1 transition-all duration-200"
          style={{
            width: 64, height: 36, borderRadius: 18,
            background: active ? 'rgba(47, 107, 255, 0.18)' : 'transparent',
          }}
        >
          <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className="text-[10px] leading-none" style={{ fontWeight: active ? 600 : 500 }}>{item.label}</span>
      </button>
    )
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white flex items-stretch justify-around"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -2px 16px rgba(15, 23, 42, 0.08)',
        borderTop: '1px solid #f1f5f9',
      }}
    >
      {leftItems.map(renderTab)}

      {posAllowed && (
        <div className="flex flex-col items-center justify-end flex-1 min-w-0">
          <button
            onClick={() => setView('pos')}
            className="relative flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 56, height: 56, borderRadius: 18,
              background: GRADIENT,
              boxShadow: view === 'pos'
                ? '0 6px 20px rgba(47, 107, 255, 0.45), 0 3px 8px rgba(47, 107, 255, 0.3)'
                : '0 4px 12px rgba(47, 107, 255, 0.35), 0 2px 6px rgba(47, 107, 255, 0.25)',
              marginTop: -20,
              marginBottom: 2,
            }}
            aria-label="Point of Sale"
          >
            <ShoppingCart className="w-6 h-6 text-white" strokeWidth={2.5} />
            {cartQty > 0 && (
              <span
                className="absolute -top-1 -right-1 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white"
                style={{ minWidth: 20, height: 20, borderRadius: 10, background: '#EF4444', padding: '0 4px' }}
              >
                {cartQty > 99 ? '99+' : cartQty}
              </span>
            )}
          </button>
          <span className="text-[10px] leading-none mb-1" style={{ color: view === 'pos' ? '#2F6BFF' : '#94a3b8', fontWeight: view === 'pos' ? 600 : 500 }}>POS</span>
        </div>
      )}

      {rightItems.map(renderTab)}

      <button
        onClick={toggleMobileNav}
        className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 transition-colors min-w-0"
        style={{ color: '#94a3b8' }}
      >
        <span
          className="flex items-center justify-center mb-1"
          style={{ width: 64, height: 36, borderRadius: 18 }}
        >
          <MenuIcon className="w-[22px] h-[22px]" strokeWidth={2} />
        </span>
        <span className="text-[10px] font-medium leading-none">More</span>
      </button>
    </nav>
  )
}
