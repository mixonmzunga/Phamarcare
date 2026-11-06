'use client'

import { useNav } from '@/lib/store'
import { NAV_ITEMS, hasPermission } from '@/lib/nav'
import { useAuth } from '@/components/providers'
import { Pill, ChevronLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, sidebarCollapsed, toggleSidebar } = useNav()
  const { user } = useAuth()
  const role = user?.role || ''
  const items = NAV_ITEMS.filter((item) => hasPermission(role, item.permission))

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/5 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>
          <Pill className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden flex-1">
            <h1 className="font-bold text-base leading-tight text-white tracking-tight">PharmaCare</h1>
            <p className="text-[10px] text-slate-400 leading-tight uppercase tracking-wider">Pharmacy ERP</p>
          </div>
        )}
        {/* Mobile close button - only visible inside the Sheet */}
        {onNavigate && (
          <button onClick={onNavigate} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
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
                onClick={() => { setView(item.key); onNavigate?.() }}
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

      {/* Collapse toggle - desktop only */}
      <div className="p-3 border-t border-white/5 shrink-0 hidden lg:block">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useNav()

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        style={{ background: 'linear-gradient(180deg, #1e2a5e 0%, #172149 100%)' }}
        className={cn(
          'hidden lg:flex flex-col text-slate-300 border-r border-white/5 transition-all duration-300 no-print relative shrink-0',
          sidebarCollapsed ? 'w-[76px]' : 'w-64'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-0 overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #1e2a5e 0%, #172149 100%)' }}
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full text-slate-300">
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
