'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o password errati'
        : error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f3d1e 0%, #1a5c2e 60%, #2d7a46 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/it/a/a8/Capitolina_Rugby_Logo.png"
            alt="URC"
            className="h-24 w-24 rounded-full bg-white p-1 shadow-xl mb-4"
          />
          <h1 className="text-3xl font-bold text-white">URCRide</h1>
          <p className="text-white/70 text-sm mt-1">Unione Rugby Capitolina</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Accedi</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e] focus:border-transparent"
                placeholder="nome@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{ background: '#1a5c2e' }}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Non hai un account?{' '}
            <Link href="/auth/register" className="font-semibold" style={{ color: '#1a5c2e' }}>
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
