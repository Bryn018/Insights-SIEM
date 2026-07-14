import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import Keycloak from 'next-auth/providers/keycloak'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import type { Role } from '@/lib/rbac'

const SESSION_SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-insecure-change-me'
const SYSTEM_USER_ID = 'system'

// Optional enterprise SSO (OIDC via Keycloak-compatible IdP) — enabled only when
// env vars are present. Works with Keycloak, and any OIDC IdP configured as a
// Keycloak-compatible issuer (Entra ID, Okta, etc. can be wired the same way).
function oidcProvider() {
  const issuer = process.env.OIDC_ISSUER
  const clientId = process.env.OIDC_CLIENT_ID
  const clientSecret = process.env.OIDC_CLIENT_SECRET
  if (!issuer || !clientId || !clientSecret) return null
  return Keycloak({
    clientId,
    clientSecret,
    issuer,
    profile(profile) {
      const email = (profile.email as string)?.toLowerCase().trim()
      return {
        id: profile.sub as string,
        name: (profile.name as string) ?? (profile.preferred_username as string) ?? email,
        email,
        image: profile.picture as string,
      }
    },
    // Provisioning/linking is handled in the jwt callback (auth.ts).
  })
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: SESSION_SECRET,
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })
        if (!user || !user.isActive) return null
        if (!verifyPassword(credentials.password, user.passwordHash)) return null
        await db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {})
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
    ...(oidcProvider() ? [oidcProvider()!] : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // Credentials: user.id is already our DB id (set in authorize()).
        // OIDC: user.id is the IdP subject — upsert our DB record and use it.
        if (account?.provider === 'oidc' || account?.provider === 'keycloak') {
          const email = (user.email ?? '').toLowerCase().trim()
          let dbUser = await db.user.findFirst({
            where: { OR: [{ oidcId: user.id }, { email }] },
          })
          if (!dbUser) {
            const org = email
              ? await db.organization.findFirst({ where: { domain: email.split('@')[1] } }).catch(() => null)
              : null
            dbUser = await db.user
              .create({
                data: {
                  email,
                  name: user.name ?? email,
                  passwordHash: '',
                  role: 'analyst',
                  provider: 'oidc',
                  oidcId: user.id,
                  orgId: org?.id ?? null,
                },
              })
              .catch(() => null)
            if (dbUser) {
              await db.auditLog
                .create({ data: { userId: dbUser.id, action: 'user.provision', resource: 'user', resourceId: dbUser.id, details: JSON.stringify({ provider: account.provider }) } })
                .catch(() => {})
            }
          } else if (!dbUser.oidcId) {
            await db.user.update({ where: { id: dbUser.id }, data: { oidcId: user.id, provider: 'oidc' } }).catch(() => {})
          }
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.orgId = dbUser.orgId ?? null
            return token
          }
        }
        token.id = (user as { id: string }).id
        token.role = (user as { role?: string }).role ?? 'analyst'
        const dbUser = await db.user.findUnique({ where: { id: (user as { id: string }).id } }).catch(() => null)
        if (dbUser) token.orgId = dbUser.orgId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { orgId?: string | null }).orgId = (token.orgId as string | null) ?? null
      }
      return session
    },
  },
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

// RBAC primitives live in rbac.ts (pure, unit-tested). Re-exported here so
// existing imports from '@/lib/auth' keep working.
export {
  hasPermission,
  requirePermission,
  errorStatus,
  type Role,
} from '@/lib/rbac'

/**
 * Resolve the current user from the live session.
 * Falls back to a system user when unauthenticated (preserves the original
 * contract so existing routes that only need an identity keep working).
 * For strict enforcement in new routes, use requireUser().
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const u = session.user as { id?: string; email?: string; name?: string; role?: string }
    if (u.id && u.email) {
      return {
        id: u.id,
        email: u.email,
        name: u.name ?? u.email,
        role: (u.role as Role) ?? 'viewer',
      }
    }
  }
  return {
    id: SYSTEM_USER_ID,
    email: 'system@siem.local',
    name: 'System',
    role: 'admin',
  }
}

/**
 * Strict guard for new routes: returns the user or throws a 401.
 * Use: `const user = await requireUser(); requirePermission(user.role, 'analyst')`
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (user.id === SYSTEM_USER_ID) {
    const err = new Error('Unauthorized') as Error & { status?: number }
    err.status = 401
    throw err
  }
  return user
}

/**
 * Append an audit-log entry for a real action. Never throws — failures are logged.
 */
export async function auditLog(params: {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? 'system',
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

/**
 * Multi-tenancy: return the current user's orgId (null = unscoped / global).
 * Pair with scopeOrg() when building Prisma where-clauses so a tenant only
 * ever sees its own data.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (user.id === SYSTEM_USER_ID) return null
  const dbUser = await db.user.findUnique({ where: { id: user.id } }).catch(() => null)
  return dbUser?.orgId ?? null
}

/**
 * Merge org scoping into a Prisma where-clause. If orgId is null, no scoping is
 * applied (global/admin view). Otherwise only rows matching orgId are returned.
 */
export function scopeOrg<T extends Record<string, unknown>>(where: T, orgId: string | null): T {
  if (!orgId) return where
  return { ...where, orgId } as T
}
