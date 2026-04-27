import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
// types used inline below
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: usersCount },
    { count: ridesCount },
    { count: requestsCount },
    { count: eventsCount },
    { data: recentUsers },
    { data: recentRides },
    { data: pendingRequests },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('ride_offers').select('id', { count: 'exact' }).eq('status', 'active').gte('date', today),
    supabase.from('ride_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabase.from('events').select('id', { count: 'exact' }).gte('date', today),
    supabase.from('profiles')
      .select('id, full_name, zone, role, team:teams(name), created_at, is_verified')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('ride_offers')
      .select('id, date, time_departure, direction, seats_available, status, driver:profiles(full_name), event:events(title)')
      .eq('status', 'active')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(10),
    supabase.from('ride_requests')
      .select('id, created_at, message, passenger:profiles(full_name), ride_offer:ride_offers(date, driver:profiles(full_name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const stats = [
    { icon: '👥', label: 'Utenti registrati', value: usersCount || 0, color: '#1a5c2e' },
    { icon: '🚗', label: 'Passaggi attivi', value: ridesCount || 0, color: '#2563eb' },
    { icon: '⏳', label: 'Richieste in attesa', value: requestsCount || 0, color: '#d97706' },
    { icon: '📅', label: 'Prossimi eventi', value: eventsCount || 0, color: '#7c3aed' },
  ]

  const DIRECTION_LABELS: Record<string, string> = {
    to_field: '→ Campo',
    from_field: '← Casa',
    both: '↔ A/R',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-4xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-black text-gray-900">Pannello Admin</h1>
        </div>

        {/* ── Stats ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Utenti recenti ───────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Utenti recenti</h2>
              <Link href="/admin/users" className="text-sm font-medium" style={{ color: '#1a5c2e' }}>
                Gestisci →
              </Link>
            </div>
            <div className="card divide-y divide-gray-100">
              {(recentUsers || []).map((u: { id: string; full_name?: string; zone?: string; role?: string; is_verified?: boolean; created_at?: string }) => (
                <div key={u.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: '#1a5c2e' }}>
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.zone || u.role || '–'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {u.is_verified && <span className="badge badge-green text-xs">✓</span>}
                    <span className="text-xs text-gray-400">
                      {u.created_at ? format(new Date(u.created_at), 'd/M', { locale: it }) : ''}
                    </span>
                  </div>
                </div>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <p className="p-4 text-sm text-gray-400 text-center">Nessun utente</p>
              )}
            </div>
          </section>

          {/* ── Passaggi attivi ──────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Passaggi attivi</h2>
              <Link href="/rides" className="text-sm font-medium" style={{ color: '#1a5c2e' }}>
                Vedi tutti →
              </Link>
            </div>
            <div className="card divide-y divide-gray-100">
              {(recentRides || []).map((r: {
                id: string
                date: string
                time_departure: string
                direction: string
                seats_available: number
                driver: { full_name: string }[]
                event: { title: string }[]
              }) => (
                <Link key={r.id} href={`/rides/${r.id}`} className="p-3 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors block">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {r.driver?.[0]?.full_name || 'Driver'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.date ? format(new Date(r.date), 'd MMM', { locale: it }) : ''}
                      {' · '}{r.time_departure?.slice(0, 5)}
                      {' · '}{DIRECTION_LABELS[r.direction] || r.direction}
                    </p>
                    {r.event?.[0] && (
                      <p className="text-xs text-[#1a5c2e] truncate">{r.event[0].title}</p>
                    )}
                  </div>
                  <span className="badge badge-blue flex-shrink-0">{r.seats_available} posti</span>
                </Link>
              ))}
              {(!recentRides || recentRides.length === 0) && (
                <p className="p-4 text-sm text-gray-400 text-center">Nessun passaggio attivo</p>
              )}
            </div>
          </section>

          {/* ── Richieste pending ────────────────────────────── */}
          {pendingRequests && pendingRequests.length > 0 && (
            <section className="md:col-span-2">
              <h2 className="section-title">Richieste in attesa ({pendingRequests.length})</h2>
              <div className="card divide-y divide-gray-100">
                {pendingRequests.map((req: {
                  id: string
                  created_at: string
                  message: string | null
                  passenger: { full_name: string }[]
                  ride_offer: { date: string; driver: { full_name: string }[] }[]
                }) => (
                  <div key={req.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {req.passenger?.[0]?.full_name} → {req.ride_offer?.[0]?.driver?.[0]?.full_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {req.ride_offer?.[0]?.date ? format(new Date(req.ride_offer[0].date), 'd MMM', { locale: it }) : ''}
                        {' · '}{req.created_at ? format(new Date(req.created_at), 'HH:mm', { locale: it }) : ''}
                      </p>
                      {req.message && (
                        <p className="text-xs text-gray-500 italic truncate">&ldquo;{req.message}&rdquo;</p>
                      )}
                    </div>
                    <span className="badge badge-gold flex-shrink-0">⏳ Attesa</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Gestione eventi ──────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Gestione eventi</h2>
              <Link href="/admin/events/new" className="btn-primary text-xs px-3 py-1.5 min-h-0 rounded-lg">
                + Nuovo
              </Link>
            </div>
            <div className="card p-4 space-y-3">
              <Link href="/events" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Calendario eventi</p>
                  <p className="text-xs text-gray-400">Visualizza tutti gli eventi</p>
                </div>
                <span className="ml-auto text-gray-400">→</span>
              </Link>
              <div className="border-t border-gray-100" />
              <Link href="/admin/events/new" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                <span className="text-2xl">➕</span>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Crea evento</p>
                  <p className="text-xs text-gray-400">Aggiungi partita, allenamento...</p>
                </div>
                <span className="ml-auto text-gray-400">→</span>
              </Link>
            </div>
          </section>

          {/* ── Link rapidi ──────────────────────────────────── */}
          <section>
            <h2 className="section-title">Azioni rapide</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/admin/users', icon: '👥', label: 'Gestisci utenti' },
                { href: '/admin/events/new', icon: '📅', label: 'Nuovo evento' },
                { href: '/map', icon: '🗺️', label: 'Mappa utenti' },
                { href: '/rides', icon: '🚗', label: 'Tutti i passaggi' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="card p-3 flex items-center gap-2 hover:shadow-md transition-shadow">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
