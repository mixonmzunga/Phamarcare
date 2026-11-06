'use client'

import { useAuth } from '@/components/providers'
import { useNav } from '@/lib/store'
import { NAV_ITEMS, ROLE_LABELS } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Bell, Search, Settings, LogOut, Menu, ChevronRight, X, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export function Topbar() {
  const { user, logout } = useAuth()
  const { view, setView, toggleMobileNav } = useNav()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=5')
      if (!res.ok) return { items: [], unread: 0 }
      return res.json()
    },
    refetchInterval: 60000,
  })

  const unread = notifData?.unread ?? 0
  const currentLabel = NAV_ITEMS.find((i) => i.key === view)?.label || 'Dashboard'
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  function submitSearch() {
    if (searchVal) {
      setView('medicines', { search: searchVal })
      setSearchOpen(false)
    }
  }

  return (
    <header className="h-14 sm:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 shrink-0 no-print z-20">
      {/* Mobile hamburger - opens sidebar drawer */}
      <Button variant="ghost" size="icon" onClick={toggleMobileNav} className="lg:hidden hover:bg-slate-100 shrink-0">
        <Menu className="w-5 h-5 text-slate-700" />
      </Button>

      {/* Breadcrumb - desktop only */}
      <div className="hidden md:flex items-center gap-1.5 text-sm shrink-0">
        <span className="text-slate-400">PharmaCare</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-800 truncate max-w-[180px]">{currentLabel}</span>
      </div>

      {/* Desktop search */}
      <div className="flex-1 max-w-md mx-auto hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search medicines, invoices, customers..."
            className="pl-10 h-9 sm:h-10 bg-slate-100/70 border-transparent rounded-full focus-visible:bg-white focus-visible:border-slate-200 transition-colors text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                setView('medicines', { search: (e.target as HTMLInputElement).value })
              }
            }}
          />
        </div>
      </div>

      {/* Mobile spacer to push actions right */}
      <div className="flex-1 sm:hidden" />

      {/* Mobile search trigger */}
      <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="sm:hidden hover:bg-slate-100 shrink-0">
        <Search className="w-5 h-5 text-slate-700" />
      </Button>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100">
              <Bell className="w-[18px] h-[18px] text-slate-600" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80 rounded-xl shadow-lg">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unread > 0 && <Badge variant="destructive" className="text-[10px]">{unread} new</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifData?.items?.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">No notifications</div>
            )}
            {notifData?.items?.map((n: any) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start py-2.5 gap-0.5 rounded-lg mx-1">
                <span className="text-sm font-medium text-slate-700">{n.title}</span>
                <span className="text-xs text-slate-500 line-clamp-2">{n.message}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView('notifications')} className="justify-center text-primary font-medium rounded-lg mx-1">
              View All Notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings shortcut - hidden on small mobile */}
        <Button variant="ghost" size="icon" onClick={() => setView('settings')} className="hidden sm:flex rounded-full hover:bg-slate-100">
          <Settings className="w-[18px] h-[18px] text-slate-600" />
        </Button>

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-1 sm:pl-1.5 py-1 rounded-full hover:bg-slate-100 transition-colors">
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-white shadow-sm" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>
                <AvatarFallback className="text-white text-[11px] sm:text-xs font-semibold" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left pr-1">
                <p className="text-[13px] font-semibold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight uppercase tracking-wide">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500 font-normal">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView('settings')} className="rounded-lg mx-1 sm:hidden">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView('pos')} className="rounded-lg mx-1 sm:hidden">
              <ShoppingCart className="w-4 h-4 mr-2" /> Point of Sale
            </DropdownMenuItem>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive rounded-lg mx-1">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile search Sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="h-auto p-4 rounded-b-2xl">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-left">Search</SheetTitle>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              autoFocus
              placeholder="Search medicines, invoices, customers..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-10 h-12 bg-slate-100 border-transparent rounded-xl text-base"
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch() }}
            />
          </div>
          <Button onClick={submitSearch} className="w-full mt-3 h-11" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>
            Search
          </Button>
        </SheetContent>
      </Sheet>
    </header>
  )
}
