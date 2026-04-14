'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/map', label: 'Mappa', icon: '🗺️' },
  { href: '/rides', label: 'Passaggi', icon: '🚗' },
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/messages', label: 'Messaggi', icon: '💬' },
  { href: '/profile', label: 'Profilo', icon: '👤' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 shadow-md"
        style={{ background: '#1a5c2e' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/it/a/a8/Capitolina_Rugby_Logo.png"
            alt="URC Logo"
            className="h-10 w-10 rounded-full object-contain bg-white p-0.5"
          />
          <span className="text-white font-bold text-xl tracking-tight">URCRide</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Esci
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white shadow-lg">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'text-[#1a5c2e]'
                : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
