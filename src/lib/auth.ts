import { db } from './db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'pharmacare_session'
const SECRET = process.env.AUTH_SECRET || 'pharmacare-dev-secret-change-in-production-9f2k4'

// ----------------- Password hashing (scrypt) -----------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'))
}

// ----------------- Signed session token -----------------

function sign(payload: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

function verify(token: string): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  if (sig.length !== expected.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
  } catch {
    return null
  }
  return payload
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, ts: Date.now() })
  return sign(Buffer.from(payload).toString('base64url'))
}

export async function getSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payloadB64 = verify(token)
  if (!payloadB64) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as { uid: string; ts: number }
    // expire after 7 days
    if (Date.now() - payload.ts > 7 * 24 * 60 * 60 * 1000) return null
    const user = await db.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, name: true, email: true, role: true, isActive: true, employeeId: true },
    })
    if (!user || !user.isActive) return null
    return user
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string) {
  const store = await cookies()
  const token = createSessionToken(userId)
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// ----------------- RBAC -----------------

export const PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  PHARMACY_ADMIN: ['dashboard.*', 'medicine.*', 'inventory.*', 'pos.*', 'sales.*', 'purchases.*', 'customers.*', 'suppliers.*', 'returns.*', 'accounts.*', 'reports.*', 'hr.*', 'expenses.*', 'services.*', 'notifications.*', 'users.*', 'settings.*', 'backup.*'],
  PHARMACIST: ['dashboard.view', 'medicine.*', 'inventory.view', 'pos.*', 'sales.*', 'customers.view', 'returns.*', 'reports.view'],
  CASHIER: ['dashboard.view', 'pos.*', 'sales.view', 'customers.view', 'services.*'],
  STOREKEEPER: ['dashboard.view', 'inventory.*', 'purchases.*', 'suppliers.view', 'returns.*', 'reports.view'],
  ACCOUNTANT: ['dashboard.view', 'accounts.*', 'expenses.*', 'reports.*', 'purchases.view', 'sales.view'],
  HR_MANAGER: ['dashboard.view', 'hr.*', 'employees.*', 'users.view'],
}

export function hasPermission(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role] || []
  if (perms.includes('*')) return true
  if (perms.includes(permission)) return true
  // wildcard module check e.g. "sales.*" matches "sales.view"
  const [mod] = permission.split('.')
  if (perms.includes(`${mod}.*`)) return true
  return false
}

export async function requireUser() {
  const user = await getSession()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requirePermission(permission: string) {
  const user = await requireUser()
  if (!hasPermission(user.role, permission)) {
    throw new Error('FORBIDDEN')
  }
  return user
}

export function errorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'FORBIDDEN') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    return Response.json({ error: error.message }, { status: 400 })
  }
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
