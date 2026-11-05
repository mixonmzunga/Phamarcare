'use client'

import { useAuth } from '@/components/providers'
import { LoginPage } from '@/components/login-page'
import { AppShell } from '@/components/app-shell'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return <LoginPage />
  return <AppShell />
}
