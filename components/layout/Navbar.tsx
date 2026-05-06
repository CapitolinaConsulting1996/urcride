'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import type { UserProfile } from '@/types'

const NAV = [
  { href: '/dashboard',      label: 'Home',     icon: '🏠' },
  { href: '/rides',          label: 'Passaggi', icon: '🚗' },
  { href: '/my-rides',       label: 'I miei',   icon: '🎫' },
  { href: '/events',         label: 'Eventi',   icon: '📅' },
  { href: '/map',            label: 'Mappa',    icon: '🗺️' },
  { href: '/messages',       label: 'Chat',     icon: '💬' },
  { href: '/notifications',  label: 'Avvisi',   icon: '🔔' },
  { href: '/profile',        label: 'Profilo',  icon: '👤' },
]

// Mobile: 5 tab — "I miei" sostituisce "Eventi" (raggiungibili dalla Home)
const MOBILE_NAV = [
  { href: '/dashboard',  label: 'Home',     icon: '🏠' },
  { href: '/rides',      label: 'Passaggi', icon: '🚗' },
  { href: '/my-rides',   label: 'I miei',   icon: '🎫' },
  { href: '/messages',   label: 'Chat',     icon: '💬' },
  { href: '/profile',    label: 'Profilo',  icon: '👤' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [unread, setUnread] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [pendingRideRequests, setPendingRideRequests] = useState(0)

  const fetchCounts = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return null
    const [{ count: msgCount }, { count: notifCount }, { data: myOfferIds }] = await Promise.all([
      supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', u.id).eq('read', false),
      supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', u.id).eq('read', false),
      supabase.from('ride_offers').select('id').eq('driver_id', u.id).eq('status', 'active'),
    ])
    setUnread(msgCount || 0)
    setUnreadNotifs(notifCount || 0)
    if (myOfferIds && myOfferIds.length > 0) {
      const ids = myOfferIds.map(o => o.id)
      const { count: pendingCount } = await supabase
        .from('ride_requests').select('id', { count: 'exact' })
        .in('ride_offer_id', ids).eq('status', 'pending')
      setPendingRideRequests(pendingCount || 0)
    } else {
      setPendingRideRequests(0)
    }
    return u
  }

  useEffect(() => { fetchCounts() }, [pathname])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    async function init() {
      const u = await fetchCounts()
      if (!u) return
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      if (data) setUser(data as UserProfile)
      channel = supabase
        .channel(`navbar-notifs-${u.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${u.id}` },
          () => setUnreadNotifs(n => n + 1))
        .subscribe()
    }
    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const totalBadge = unread + unreadNotifs

  return (
    <>
      {/* ── Desktop top bar ──────────────────────────── */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-6 shadow-sm"
        style={{ background: '#1a5c2e' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://upload.wikimedia.org/wikipedia/it/a/a8/Capitolina_Rugby_Logo.png"
            alt="URC" className="h-9 w-9 rounded-full bg-white p-0.5 object-contain" />
          <span className="text-white font-bold text-lg tracking-tight">URCRide</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                isActive(item.href) ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}>
              {item.label}
              {item.href === '/messages' && unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">{unread}</span>
              )}
              {item.href === '/notifications' && unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber-400 text-white text-[10px] rounded-full flex items-center justify-center px-1">{unreadNotifs}</span>
              )}
              {item.href === '/my-rides' && pendingRideRequests > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber-400 text-white text-[10px] rounded-full flex items-center justify-center px-1">{pendingRideRequests}</span>
              )}
            </Link>
          ))}
          {user?.is_admin && (
            <Link href="/admin"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin') ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}>
              ⚙️ Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
              {user?.full_name?.charAt(0) || '?'}
            </div>
          </Link>
          <button onClick={logout} className="text-white/60 hover:text-white text-sm transition-colors">Esci</button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch h-16">
          {MOBILE_NAV.map(item => {
            const active = isActive(item.href)
            const hasBadge =
              (item.href === '/messages' && unread > 0) ||
              (item.href === '/my-rides' && pendingRideRequests > 0) ||
              (item.href === '/profile' && totalBadge > 0)
            const badgeCount =
              item.href === '/messages' ? unread :
              item.href === '/my-rides' ? pendingRideRequests :
              totalBadge

            return (
              <Link key={item.href} href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 relative tap-highlight-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}>

                {/* Pill background for active tab */}
                {active && (
                  <span className="absolute inset-x-2 inset-y-1.5 rounded-2xl"
                    style={{ background: '#1a5c2e18' }} />
                )}

                <span className={`text-2xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-semibold tracking-tight transition-colors ${
                  active ? 'text-[#1a5c2e]' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>

                {/* Badge notifiche */}
                {hasBadge && (
                  <span className="absolute top-2 right-[18%] min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
