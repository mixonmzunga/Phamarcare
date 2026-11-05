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
import { Bell, Search, Settings, LogOut, User, Menu } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export function Topbar() {
  const { user, logout } = useAuth()
  const { view, setView, toggleSidebar } = useNav()
  const [today] = useState(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }))

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

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0 no-print">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:flex hidden">
        <Menu className="w-5 h-5" />
      </Button>
      <div className="hidden md:block">
        <h2 className="text-lg font-semibold text-slate-800 leading-tight">{currentLabel}</h2>
        <p className="text-xs text-slate-500">{today}</p>
      </div>

      <div className="flex-1 max-w-md mx-auto hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search medicines, invoices, customers..."
            className="pl-9 h-10 bg-slate-50 border-slate-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                setView('medicines', { search: (e.target as HTMLInputElement).value })
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unread > 0 && <Badge variant="destructive">{unread} new</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifData?.items?.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">No notifications</div>
            )}
            {notifData?.items?.map((n: any) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start py-2 gap-0.5">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="text-xs text-slate-500 line-clamp-2">{n.message}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView('notifications')} className="justify-center text-primary font-medium">
              View All Notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings shortcut */}
        <Button variant="ghost" size="icon" onClick={() => setView('settings')}>
          <Settings className="w-5 h-5 text-slate-600" />
        </Button>

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 transition-colors">
              <Avatar className="w-9 h-9 bg-primary text-primary-foreground">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-slate-500 font-normal">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView('settings')}>
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
