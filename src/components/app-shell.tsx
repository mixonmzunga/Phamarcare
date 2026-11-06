'use client'

import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { useNav } from '@/lib/store'
import { DashboardModule } from '@/components/modules/dashboard'
import { MedicinesModule } from '@/components/modules/medicines'
import { InventoryModule } from '@/components/modules/inventory'
import { PosModule } from '@/components/modules/pos'
import { SalesModule } from '@/components/modules/sales'
import { PurchasesModule } from '@/components/modules/purchases'
import { CustomersModule } from '@/components/modules/customers'
import { SuppliersModule } from '@/components/modules/suppliers'
import { ReturnsModule } from '@/components/modules/returns'
import { AccountsModule } from '@/components/modules/accounts'
import { ReportsModule } from '@/components/modules/reports'
import { EmployeesModule } from '@/components/modules/employees'
import { ServicesModule } from '@/components/modules/services'
import { ExpensesModule } from '@/components/modules/expenses'
import { NotificationsModule } from '@/components/modules/notifications'
import { UsersModule } from '@/components/modules/users'
import { SettingsModule } from '@/components/modules/settings'
import { BackupModule } from '@/components/modules/backup'

const MODULES: Record<string, () => React.ReactNode> = {
  dashboard: () => <DashboardModule />,
  medicines: () => <MedicinesModule />,
  inventory: () => <InventoryModule />,
  pos: () => <PosModule />,
  sales: () => <SalesModule />,
  purchases: () => <PurchasesModule />,
  customers: () => <CustomersModule />,
  suppliers: () => <SuppliersModule />,
  returns: () => <ReturnsModule />,
  accounts: () => <AccountsModule />,
  reports: () => <ReportsModule />,
  employees: () => <EmployeesModule />,
  services: () => <ServicesModule />,
  expenses: () => <ExpensesModule />,
  notifications: () => <NotificationsModule />,
  users: () => <UsersModule />,
  settings: () => <SettingsModule />,
  backup: () => <BackupModule />,
}

export function AppShell() {
  const { view } = useNav()
  const Module = MODULES[view] || MODULES.dashboard

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto scroll-thin">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-3 sm:p-4 md:p-6">
              {Module()}
            </div>
            <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 text-center text-[11px] sm:text-xs text-slate-500 no-print">
              &copy; {new Date().getFullYear()} PharmaCare Pharmacy Management ERP &middot; All rights reserved
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
