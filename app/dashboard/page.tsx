import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import RideCard from '@/components/ui/RideCard'
import EventCard from '@/components/ui/EventCard'
import type { UserProfile, RideOffer, ClubEvent } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: profile },
    { data: upcomingRides },
    { data: upcomingEvents },
    { data: myRequests },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*, team:teams(*)').eq('id', user.id).single(),
    supabase.from('ride_offers')
      .select('*, driver:profiles(id,full_name,zone,address,rating_avg,trips_completed,is_verified), event:events(id,title)')
      .eq('status', 'active')
      .gte('date', today)
      .neq('driver_id', user.id)
      .order('date', { ascending: true })
      .limit(5),
    supabase.from('events')
      .select('*, team:teams(name)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(6),
    supabase.from('ride_requests')
      .select('*, ride_offer:ride_offers(date, time_departure, driver:profiles(full_name))')
      .eq('passenger_id', user.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('messages').select('id', { count: 'exact' })
      .eq('receiver_id', user.id).eq('read', false),
  ])

  const p = profile as UserProfile
  const rides = (upcomingRides || []) as RideOffer[]
  const events = (upcomingEvents || []) as ClubEvent[]
  const todayRides = rides.filter(r => r.date === today)
  const firstName = p?.full_name?.split(' ')[0] || 'amico'

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buongiorno'
    if (h < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-2xl mx-auto space-y-6">

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f3d1e 0%, #1a5c2e 60%, #2d7a46 100%)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">{greeting()},</p>
              <h1 className="text-2xl font-black mt-0.5">{firstName} 👋</h1>
              {p?.team && (
                <p className="text-white/60 text-xs mt-1">🏉 {p.team.name}</p>
              )}
            </div>
            <Link href="/profile">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black border-2 border-white/30">
                {p?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </Link>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
            {[
              { v: p?.trips_completed || 0, l: 'Viaggi' },
              { v: (p?.rating_avg || 0) > 0 ? p.rating_avg.toFixed(1) : '–', l: 'Rating' },
              { v: unreadCount || 0, l: 'Messaggi' },
            ].map(s => (
              <div key={s.l} className="flex-1 text-center">
                <div className="text-xl font-black">{s.v}</div>
                <div className="text-xs text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Alert profilo incompleto ──────────────────────── */}
        {(!p?.lat || p.lat === 0) && (
          <Link href="/profile">
            <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Completa il tuo profilo</p>
                <p className="text-amber-600 text-xs mt-0.5">Aggiungi indirizzo e zona per comparire sulla mappa →</p>
              </div>
            </div>
          </Link>
        )}

        {/* ── Quick actions ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/rides" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <span className="text-3xl">🔍</span>
            <p className="font-bold text-gray-900 text-sm">Trova passaggio</p>
            <p className="text-xs text-gray-400 text-center">Cerca chi va al campo</p>
          </Link>
          <Link href="/rides/new" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow border-2"
            style={{ borderColor: '#1a5c2e' }}>
            <span className="text-3xl">🚗</span>
            <p className="font-bold text-sm" style={{ color: '#1a5c2e' }}>Offri passaggio</p>
            <p className="text-xs text-gray-400 text-center">Aggiungi posti a bordo</p>
          </Link>
        </div>

        {/* ── Mie prenotazioni attive ───────────────────────── */}
        {myRequests && myRequests.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Le mie prenotazioni</h2>
              <Link href="/bookings" className="text-sm font-medium" style={{ color: '#1a5c2e' }}>Vedi tutte →</Link>
            </div>
            <div className="space-y-2">
              {myRequests.map((req: {
                id: string
                status: string
                ride_offer?: { date?: string; time_departure?: string; driver?: { full_name?: string } }
              }) => (
                <div key={req.id} className="card p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {(req.ride_offer as { driver?: { full_name?: string } } | undefined)?.driver?.full_name || 'Driver'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.ride_offer?.date && format(new Date(req.ride_offer.date), 'EEE d MMM', { locale: it })}
                      {req.ride_offer?.time_departure && ` · ${req.ride_offer.time_departure}`}
                    </p>
                  </div>
                  <span className={`badge ${
                    req.status === 'accepted' ? 'badge-green' :
                    req.status === 'pending'  ? 'badge-gold' : 'badge-red'
                  }`}>
                    {req.status === 'accepted' ? '✓ Confermato' :
                     req.status === 'pending'  ? '⏳ In attesa' : '✗ Rifiutato'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Prossimi eventi ───────────────────────────────── */}
        {events.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Prossimi eventi</h2>
              <Link href="/events" className="text-sm font-medium" style={{ color: '#1a5c2e' }}>Tutti →</Link>
            </div>
            <div className="scroll-x">
              {events.map(ev => (
                <EventCard key={ev.id} event={ev} compact />
              ))}
            </div>
          </section>
        )}

        {/* ── Passaggi oggi ─────────────────────────────────── */}
        {todayRides.length > 0 && (
          <section>
            <h2 className="section-title">Passaggi disponibili oggi</h2>
            <div className="space-y-3">
              {todayRides.map(r => (
                <RideCard key={r.id} offer={r} compact />
              ))}
            </div>
          </section>
        )}

        {/* ── Prossimi passaggi ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">
              {todayRides.length > 0 ? 'Altri passaggi in settimana' : 'Passaggi disponibili'}
            </h2>
            <Link href="/rides" className="text-sm font-medium" style={{ color: '#1a5c2e' }}>Vedi tutti →</Link>
          </div>
          {rides.filter(r => r.date !== today).length === 0 && rides.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">🚗</p>
              <p className="text-gray-500 text-sm">Nessun passaggio disponibile al momento</p>
              <Link href="/rides/new" className="btn-primary mt-4 inline-flex text-sm">
                Sii il primo a offrire
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.filter(r => r.date !== today).slice(0, 3).map(r => (
                <RideCard key={r.id} offer={r} compact />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick links ───────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 pb-4">
          {[
            { href: '/map',       icon: '🗺️', label: 'Mappa' },
            { href: '/my-rides',  icon: '📋', label: 'I miei' },
            { href: '/bookings',  icon: '🎫', label: 'Prenotaz.' },
            { href: '/messages',  icon: '💬', label: 'Chat' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="card p-3 flex flex-col items-center gap-1 hover:shadow-md transition-shadow">
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium text-gray-600 text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
