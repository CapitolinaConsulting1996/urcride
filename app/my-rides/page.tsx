'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { RideOffer, UserProfile } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

type RequestWithPassenger = {
  id: string
  status: string
  passenger_id: string
  message: string | null
  passenger: { full_name: string; whatsapp_number?: string }
}

type RideWithRequests = RideOffer & {
  requests?: RequestWithPassenger[]
}

const DIRECTION_LABELS: Record<string, string> = {
  to_field: '→ Al campo',
  from_field: '← A casa',
  both: '↔ A/R',
}

export default function MyRidesPage() {
  const [rides, setRides] = useState<RideWithRequests[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: profile }, { data: ridesData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
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
    ])

    if (profile) setCurrentUser(profile as UserProfile)
    setRides((ridesData || []) as RideWithRequests[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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

  const today = new Date().toISOString().split('T')[0]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center"><div className="text-5xl mb-3">🚗</div><p className="text-gray-400">Caricamento...</p></div>
    </div>
  )

  const upcoming = rides.filter(r => r.date >= today && r.status === 'active')
  const past = rides.filter(r => r.date < today || r.status !== 'active')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-black text-gray-900">I miei passaggi</h1>
          <Link href="/rides/new" className="btn-primary text-sm px-4 py-2 min-h-0 rounded-xl">
            + Nuovo
          </Link>
        </div>

        {rides.length === 0 ? (
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
            {upcoming.length > 0 && (
              <section className="mb-6">
                <h2 className="section-title">Attivi ({upcoming.length})</h2>
                <div className="space-y-3">
                  {upcoming.map(ride => (
                    <RideDriverCard
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

            {past.length > 0 && (
              <section className="mb-6">
                <h2 className="section-title text-gray-400">Passati / Cancellati ({past.length})</h2>
                <div className="space-y-3 opacity-70">
                  {past.slice(0, 10).map(ride => (
                    <RideDriverCard
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
      </main>
    </div>
  )
}

function RideDriverCard({
  ride,
  expanded,
  onToggle,
  onAccept,
  onReject,
  onCancel,
  actionLoading,
  readonly = false,
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">
                {format(new Date(ride.date), 'EEE d MMM', { locale: it })}
              </span>
              <span className="text-gray-400 text-xs">·</span>
              <span className="text-sm text-gray-600">{ride.time_departure?.slice(0, 5)}</span>
              <span className="text-xs text-gray-400">{DIRECTION_LABELS[ride.direction] || ride.direction}</span>
            </div>

            {ride.event && (
              <p className="text-xs text-[#1a5c2e] font-medium mb-1">📅 {ride.event.title}</p>
            )}

            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>🪑 {ride.seats_available} posti</span>
              {ride.price_per_seat === 0
                ? <span className="text-green-600 font-medium">Gratuito</span>
                : <span>€{ride.price_per_seat}/posto</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
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

          {/* Pending requests */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Richieste in attesa ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map(req => (
                  <div key={req.id} className="bg-amber-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-900">
                        {req.passenger?.full_name}
                      </p>
                      {!readonly && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50">
                            ✗ Rifiuta
                          </button>
                          <button
                            onClick={() => onAccept(req.id)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50">
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

          {/* Accepted passengers */}
          {accepted.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                Passeggeri confermati ({accepted.length})
              </p>
              <div className="space-y-2">
                {accepted.map(req => (
                  <div key={req.id} className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                    <p className="font-semibold text-sm text-gray-900">{req.passenger?.full_name}</p>
                    <div className="flex gap-1.5">
                      {req.passenger?.whatsapp_number && (
                        <a
                          href={`https://wa.me/${req.passenger.whatsapp_number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                          style={{ background: '#25d366' }}>
                          WA
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && accepted.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">Nessuna richiesta ancora</p>
          )}

          {/* Actions */}
          {!readonly && !isCancelled && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Link href={`/rides/${ride.id}`} className="btn-ghost text-xs py-2 flex-1 text-center rounded-xl">
                Vedi dettaglio
              </Link>
              <button
                onClick={onCancel}
                className="text-xs py-2 px-4 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-colors">
                Cancella passaggio
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
