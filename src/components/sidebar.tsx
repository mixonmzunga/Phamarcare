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
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 no-print',
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border shrink-0">
        <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
          <Pill className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-base leading-tight text-white">PharmaCare</h1>
            <p className="text-[10px] text-sidebar-foreground/70 leading-tight">Pharmacy ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 scroll-thin">
        <nav className="p-2 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                title={item.label}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
