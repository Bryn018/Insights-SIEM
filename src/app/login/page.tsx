'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password.')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold text-emerald-400">Insights SIEM</div>
          <div className="text-sm text-zinc-500">Sign in to the security console</div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="mb-1 block text-xs text-zinc-400">Email</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="you@company.com"
        />

        <label className="mb-1 block text-xs text-zinc-400">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-6 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Protected system. Authorized personnel only.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300">
            Back to console
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
