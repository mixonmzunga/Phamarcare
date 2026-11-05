import {
  LayoutDashboard, Pill, Package, ShoppingCart, Receipt, Truck,
  Users, Building2, Undo2, BookOpen, BarChart3, UserCog, Stethoscope,
  Wallet, Bell, UserPlus, Settings, DatabaseBackup,
} from 'lucide-react'
import type { ViewKey } from '@/lib/store'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  key: ViewKey
  label: string
  icon: LucideIcon
  permission: string
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { key: 'medicines', label: 'Medicine Management', icon: Pill, permission: 'medicine.view' },
  { key: 'inventory', label: 'Inventory / Stock', icon: Package, permission: 'inventory.view' },
  { key: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, permission: 'pos.view' },
  { key: 'sales', label: 'Sales Management', icon: Receipt, permission: 'sales.view' },
  { key: 'purchases', label: 'Purchase Management', icon: Truck, permission: 'purchases.view' },
  { key: 'customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { key: 'suppliers', label: 'Suppliers / Manufacturers', icon: Building2, permission: 'suppliers.view' },
  { key: 'returns', label: 'Returns Management', icon: Undo2, permission: 'returns.view' },
  { key: 'accounts', label: 'Accounts & Finance', icon: BookOpen, permission: 'accounts.view' },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, permission: 'reports.view' },
  { key: 'employees', label: 'Employees / HRM', icon: UserCog, permission: 'hr.view' },
  { key: 'services', label: 'Services Management', icon: Stethoscope, permission: 'services.view' },
  { key: 'expenses', label: 'Expenses', icon: Wallet, permission: 'expenses.view' },
  { key: 'notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
  { key: 'users', label: 'User Management', icon: UserPlus, permission: 'users.view' },
  { key: 'settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
  { key: 'backup', label: 'Backup & Restore', icon: DatabaseBackup, permission: 'backup.view' },
]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  PHARMACY_ADMIN: 'Pharmacy Admin',
  PHARMACIST: 'Pharmacist',
  CASHIER: 'Cashier',
  STOREKEEPER: 'Storekeeper',
  ACCOUNTANT: 'Accountant',
  HR_MANAGER: 'HR Manager',
}

// Client-side permission check (mirrors server side)
const PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  PHARMACY_ADMIN: ['dashboard.*', 'medicine.*', 'inventory.*', 'pos.*', 'sales.*', 'purchases.*', 'customers.*', 'suppliers.*', 'returns.*', 'accounts.*', 'reports.*', 'hr.*', 'expenses.*', 'services.*', 'notifications.*', 'users.*', 'settings.*', 'backup.*'],
  PHARMACIST: ['dashboard.view', 'medicine.*', 'inventory.view', 'pos.*', 'sales.*', 'customers.view', 'returns.*', 'reports.view'],
  CASHIER: ['dashboard.view', 'pos.*', 'sales.view', 'customers.view', 'services.*'],
  STOREKEEPER: ['dashboard.view', 'inventory.*', 'purchases.*', 'suppliers.view', 'returns.*', 'reports.view'],
  ACCOUNTANT: ['dashboard.view', 'accounts.*', 'expenses.*', 'reports.*', 'purchases.view', 'sales.view'],
  HR_MANAGER: ['dashboard.view', 'hr.*', 'users.view'],
}

export function hasPermission(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role] || []
  if (perms.includes('*')) return true
  if (perms.includes(permission)) return true
  const [mod] = permission.split('.')
  if (perms.includes(`${mod}.*`)) return true
  return false
}
