'use client'

import { useNav } from '@/lib/store'
import { NAV_ITEMS, hasPermission } from '@/lib/nav'
import { useAuth } from '@/components/providers'
import { Pill, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Sidebar() {
  const { view, setView, sidebarCollapsed, toggleSidebar } = useNav()
  const { user } = useAuth()
  const role = user?.role || ''

  const items = NAV_ITEMS.filter((item) => hasPermission(role, item.permission))

  return (
    <aside
      style={{ background: 'linear-gradient(180deg, #1e2a5e 0%, #172149 100%)' }}
      className={cn(
        'flex flex-col text-slate-300 border-r border-white/5 transition-all duration-300 no-print relative',
        sidebarCollapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/5 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>
          <Pill className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-base leading-tight text-white tracking-tight">PharmaCare</h1>
            <p className="text-[10px] text-slate-400 leading-tight uppercase tracking-wider">Pharmacy ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 scroll-thin">
        <nav className="p-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                title={item.label}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-left group relative',
                  active
                    ? 'text-white shadow-lg'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
                style={active ? { background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' } : undefined}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0 transition-transform', active && 'scale-110')} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {active && !sidebarCollapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border/60 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
