'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pill, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@pharmacare.mw')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (!res.ok) {
      toast.error(res.error || 'Login failed')
    } else {
      toast.success('Welcome to PharmaCare')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <Pill className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">PharmaCare</h1>
          <p className="text-slate-500 mt-1">Pharmacy Management ERP System</p>
        </div>
        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </Button>
            </form>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-2">Demo Accounts:</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                <div>admin@pharmacare.mw / admin123</div>
                <div>manager@pharmacare.mw / manager123</div>
                <div>cashier@pharmacare.mw / cashier123</div>
                <div>pharmacist@pharmacare.mw / pharm123</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} PharmaCare. All rights reserved.
        </p>
      </div>
    </div>
  )
}
