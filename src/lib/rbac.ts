// Pure RBAC logic — no external imports, so it is unit-testable in isolation.

export type Role = 'admin' | 'analyst' | 'responder' | 'viewer'

// ROLE_HIERARCHY[role] = the roles `role` is permitted to act as
// (itself plus every lower-privilege role). admin >= analyst >= responder >= viewer.
const ROLE_HIERARCHY: Record<Role, Role[]> = {
  admin: ['admin', 'analyst', 'responder', 'viewer'],
  analyst: ['analyst', 'responder', 'viewer'],
  responder: ['responder', 'viewer'],
  viewer: ['viewer'],
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  const allowed = ROLE_HIERARCHY[userRole as Role]
  if (!allowed) return false
  return allowed.includes(requiredRole as Role)
}

export function requirePermission(userRole: string, requiredRole: string): void {
  if (!hasPermission(userRole, requiredRole)) {
    const err = new Error(
      `Insufficient permissions. Required role: ${requiredRole}, your role: ${userRole}`
    ) as Error & { status?: number }
    err.status = 403
    throw err
  }
}

export function errorStatus(err: unknown): number {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: number }).status
    if (typeof s === 'number') return s
  }
  return 500
}
