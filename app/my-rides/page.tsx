'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { RideOffer } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// ── Tipi ─────────────────────────────────────────────────────

type RequestWithPassenger = {
  id: string
  status: string
  passenger_id: string
  message: string | null
  passenger: { full_name: string; whatsapp_number?: string }
}

type RideWithRequests = RideOffer & {
  requests?: RequestWithPassenger[]
  event?: { id: string; title: string }
}

type BookingWithOffer = {
  id: string
  status: string
  message: string | null
  created_at: string
  ride_offer: {
    id: string
    date: string
    time_departure: string
    direction: string
    price_per_seat: number
    origin_address: string | null
    driver: { full_name: string; whatsapp_number?: string } | null
    event: { title: string } | null
  } | null
}

const DIR: Record<string, string> = {
  to_field: '→ Al campo',
  from_field: '← A casa',
  both: '↔ A/R',
}

const today = new Date().toISOString().split('T')[0]

// ── Componente principale ─────────────────────────────────────

function MyRidesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [tab, setTab] = useState<'offro' | 'viaggio'>(
    searchParams.get('tab') === 'viaggio' ? 'viaggio' : 'offro'
  )

  // Driver data
  const [myOffers, setMyOffers] = useState<RideWithRequests[]>([])
  // Passenger data
  const [myBookings, setMyBookings] = useState<BookingWithOffer[]>([])

  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: offersData }, { data: bookingsData }] = await Promise.all([
      supabase.from('ride_offers')
        .select(`
          *, event:events(id,title), team:teams(id,name),
          requests:ride_requests(
            id, status, passenger_id, message,
            passenger:profiles(full_name, whatsapp_number)
          )
        `)
        .eq('driver_id', user.id)
        .order('date', { ascending: false }),
      supabase.from('ride_requests')
        .select(`
          id, status, message, created_at,
          ride_offer:ride_offers(
            id, date, time_departure, direction, price_per_seat, origin_address,
            driver:profiles(full_name, whatsapp_number),
            event:events(title)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    setMyOffers((offersData || []) as RideWithRequests[])

    // Supabase client restituisce many-to-one come oggetto singolo (non array)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBookings = (bookingsData || []) as any[]
    setMyBookings(rawBookings.map(b => {
      const ro = b.ride_offer
      if (!ro || !ro.id) return { ...b, ride_offer: null }
      const driver = Array.isArray(ro.driver) ? ro.driver[0] ?? null : ro.driver ?? null
      const event  = Array.isArray(ro.event)  ? ro.event[0]  ?? null : ro.event  ?? null
      return {
        ...b,
        ride_offer: { ...ro, driver, event },
      }
    }))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Aggiorna URL query senza navigazione
  const switchTab = (t: 'offro' | 'viaggio') => {
    setTab(t)
    setExpanded(null)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    window.history.replaceState(null, '', url.toString())
  }

  async function updateRequestStatus(requestId: string, status: 'accepted' | 'rejected') {
    setActionLoading(requestId)
    await supabase.from('ride_requests').update({ status }).eq('id', requestId)
    await load()
    setActionLoading(null)
  }

  async function cancelRide(rideId: string) {
    if (!confirm('Vuoi davvero cancellare questo passaggio?')) return
    await supabase.from('ride_offers').update({ status: 'cancelled' }).eq('id', rideId)
    await load()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center"><div className="text-5xl mb-3">🎫</div><p className="text-gray-400">Caricamento...</p></div>
    </div>
  )

  const pendingCount = myOffers.flatMap(r => r.requests || []).filter(r => r.status === 'pending').length
  const upcomingOffers = myOffers.filter(r => r.date >= today && r.status === 'active')
  const pastOffers = myOffers.filter(r => r.date < today || r.status !== 'active')
  const validBookings = myBookings.filter(b => b.ride_offer?.date)
  const upcomingBookings = validBookings.filter(b => b.ride_offer!.date >= today)
  const pastBookings = validBookings.filter(b => b.ride_offer!.date < today)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-2xl mx-auto">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-gray-900">I miei passaggi</h1>
          <Link href="/rides/new" className="btn-primary text-sm px-4 py-2 min-h-0 rounded-xl">
            + Offri
          </Link>
        </div>

        {/* ── Tab switcher ──────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: '#e8f0ea' }}>
          <button
            onClick={() => switchTab('offro')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'offro' ? 'bg-white shadow-sm text-[#1a5c2e]' : 'text-gray-500'
            }`}>
            🚗 Offro
            {pendingCount > 0 && (
              <span className="min-w-[18px] h-[18px] bg-amber-400 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => switchTab('viaggio')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'viaggio' ? 'bg-white shadow-sm text-[#1a5c2e]' : 'text-gray-500'
            }`}>
            🎫 Viaggio
            {upcomingBookings.filter(b => b.status === 'pending').length > 0 && (
              <span className="min-w-[18px] h-[18px] bg-amber-400 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                {upcomingBookings.filter(b => b.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab: Offro ────────────────────────────────────── */}
        {tab === 'offro' && (
          <>
            {myOffers.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-5xl mb-3">🚗</p>
                <p className="text-gray-500 font-medium">Non hai ancora offerto passaggi</p>
                <p className="text-gray-400 text-sm mt-1">Aiuta i tuoi compagni a raggiungere il campo</p>
                <Link href="/rides/new" className="btn-primary mt-4 inline-flex text-sm">
                  Offri il primo passaggio
                </Link>
              </div>
            ) : (
              <>
                {upcomingOffers.length > 0 && (
                  <section className="mb-5">
                    <p className="section-title">Attivi ({upcomingOffers.length})</p>
                    <div className="space-y-3">
                      {upcomingOffers.map(ride => (
                        <OfferCard
                          key={ride.id}
                          ride={ride}
                          expanded={expanded === ride.id}
                          onToggle={() => setExpanded(expanded === ride.id ? null : ride.id)}
                          onAccept={id => updateRequestStatus(id, 'accepted')}
                          onReject={id => updateRequestStatus(id, 'rejected')}
                          onCancel={() => cancelRide(ride.id)}
                          actionLoading={actionLoading}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {pastOffers.length > 0 && (
                  <section className="mb-5">
                    <p className="section-title text-gray-400">Passati / Cancellati ({pastOffers.length})</p>
                    <div className="space-y-3 opacity-60">
                      {pastOffers.slice(0, 10).map(ride => (
                        <OfferCard
                          key={ride.id}
                          ride={ride}
                          expanded={expanded === ride.id}
                          onToggle={() => setExpanded(expanded === ride.id ? null : ride.id)}
                          onAccept={id => updateRequestStatus(id, 'accepted')}
                          onReject={id => updateRequestStatus(id, 'rejected')}
                          onCancel={() => cancelRide(ride.id)}
                          actionLoading={actionLoading}
                          readonly
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ── Tab: Viaggio ──────────────────────────────────── */}
        {tab === 'viaggio' && (
          <>
            {myBookings.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-5xl mb-3">🎫</p>
                <p className="text-gray-500 font-medium">Nessuna prenotazione</p>
                <p className="text-gray-400 text-sm mt-1">Cerca un passaggio per i prossimi eventi</p>
                <Link href="/rides" className="btn-primary mt-4 inline-flex text-sm">
                  Trova passaggio
                </Link>
              </div>
            ) : (
              <>
                {upcomingBookings.length > 0 && (
                  <section className="mb-5">
                    <p className="section-title">Prossimi ({upcomingBookings.length})</p>
                    <div className="space-y-3">
                      {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                  </section>
                )}
                {pastBookings.length > 0 && (
                  <section className="mb-5">
                    <p className="section-title text-gray-400">Passati ({pastBookings.length})</p>
                    <div className="space-y-3 opacity-60">
                      {pastBookings.slice(0, 10).map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ── Card passaggio offerto (driver) ───────────────────────────

function OfferCard({
  ride, expanded, onToggle, onAccept, onReject, onCancel, actionLoading, readonly = false,
}: {
  ride: RideWithRequests
  expanded: boolean
  onToggle: () => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onCancel: () => void
  actionLoading: string | null
  readonly?: boolean
}) {
  const pending = (ride.requests || []).filter(r => r.status === 'pending')
  const accepted = (ride.requests || []).filter(r => r.status === 'accepted')
  const isCancelled = ride.status === 'cancelled'

  return (
    <div className="card overflow-hidden">
      <button className="w-full p-4 text-left" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900 text-sm">
                {format(new Date(ride.date), 'EEE d MMM', { locale: it })}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-600">{ride.time_departure?.slice(0, 5)}</span>
              <span className="text-xs text-gray-400">{DIR[ride.direction]}</span>
            </div>
            {ride.event && (
              <p className="text-xs text-[#1a5c2e] font-medium mb-1">📅 {(ride.event as { title: string }).title}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>🪑 {ride.seats_available}/{ride.seats_total} posti</span>
              {ride.price_per_seat === 0
                ? <span className="text-green-600 font-medium">Gratuito</span>
                : <span>€{ride.price_per_seat}/posto</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {isCancelled
              ? <span className="badge badge-red">Cancellato</span>
              : <span className="badge badge-green">Attivo</span>}
            {pending.length > 0 && (
              <span className="badge badge-gold">{pending.length} richieste</span>
            )}
            {accepted.length > 0 && (
              <span className="badge badge-blue">{accepted.length} confermati</span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Richieste in attesa ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map(req => (
                  <div key={req.id} className="bg-amber-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-900">{req.passenger?.full_name}</p>
                      {!readonly && (
                        <div className="flex gap-1.5">
                          <button onClick={() => onReject(req.id)} disabled={actionLoading === req.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 disabled:opacity-50">
                            ✗ Rifiuta
                          </button>
                          <button onClick={() => onAccept(req.id)} disabled={actionLoading === req.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-800 disabled:opacity-50">
                            ✓ Accetta
                          </button>
                        </div>
                      )}
                    </div>
                    {req.message && (
                      <p className="text-xs text-gray-500 italic">&ldquo;{req.message}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {accepted.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                Passeggeri confermati ({accepted.length})
              </p>
              <div className="space-y-2">
                {accepted.map(req => (
                  <div key={req.id} className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                    <p className="font-semibold text-sm text-gray-900">{req.passenger?.full_name}</p>
                    {req.passenger?.whatsapp_number && (
                      <a href={`https://wa.me/${req.passenger.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                        style={{ background: '#25d366' }}>
                        WA
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && accepted.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">Nessuna richiesta ancora</p>
          )}

          {!readonly && !isCancelled && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Link href={`/rides/${ride.id}`}
                className="btn-ghost text-xs py-2 flex-1 text-center rounded-xl">
                Vedi dettaglio
              </Link>
              <button onClick={onCancel}
                className="text-xs py-2 px-4 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-colors">
                Cancella
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Card prenotazione (passeggero) ────────────────────────────

function BookingCard({ booking: b }: { booking: BookingWithOffer }) {
  const offer = b.ride_offer
  if (!offer?.date) return null

  const statusBadge = () => {
    if (b.status === 'accepted') return <span className="badge badge-green">✓ Confermato</span>
    if (b.status === 'pending')  return <span className="badge badge-gold">⏳ In attesa</span>
    if (b.status === 'rejected') return <span className="badge badge-red">✗ Rifiutato</span>
    return <span className="badge badge-gray">Annullato</span>
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">
            {offer?.driver?.full_name || 'Driver'}
          </p>
          {offer?.event && (
            <p className="text-xs text-[#1a5c2e] font-medium mt-0.5">📅 {offer.event.title}</p>
          )}
        </div>
        {statusBadge()}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        {offer?.date && (
          <span>📅 {format(new Date(offer.date), 'EEE d MMM', { locale: it })}</span>
        )}
        <span>⏰ {offer?.time_departure?.slice(0, 5) || '–'}</span>
        <span>{DIR[offer?.direction ?? ''] || offer?.direction}</span>
        {offer?.price_per_seat === 0
          ? <span className="text-green-600 font-medium">Gratuito</span>
          : <span>€{offer?.price_per_seat}/posto</span>}
      </div>

      {offer?.origin_address && (
        <p className="text-xs text-gray-400 mb-3 truncate">📍 {offer.origin_address}</p>
      )}

      <div className="flex gap-2">
        <Link href={`/rides/${offer?.id}`}
          className="btn-ghost text-xs py-1.5 px-3 min-h-0 rounded-lg flex-1 text-center">
          Dettagli
        </Link>
        {b.status === 'accepted' && offer?.driver?.whatsapp_number && (
          <a href={`https://wa.me/${offer.driver.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-primary text-xs py-1.5 px-3 min-h-0 rounded-lg flex-1 text-center"
            style={{ background: '#25d366' }}>
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

// ── Export con Suspense per useSearchParams ───────────────────

export default function MyRidesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-gray-400">Caricamento...</p>
      </div>
    }>
      <MyRidesContent />
    </Suspense>
  )
}
