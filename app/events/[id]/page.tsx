import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import RideCard from '@/components/ui/RideCard'
import type { ClubEvent, RideOffer } from '@/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const EVENT_COLORS: Record<string, string> = {
  training: '#1a5c2e',
  match:    '#dc2626',
  away:     '#7c3aed',
  social:   '#0891b2',
  meeting:  '#374151',
  other:    '#6b7280',
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const [{ data: eventRaw }, { data: ridesRaw }, { data: myReqsRaw }] = await Promise.all([
    supabase
      .from('events')
      .select('*, team:teams(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('ride_offers')
      .select('*, driver:profiles(id,full_name,zone,address,rating_avg,trips_completed,is_verified,whatsapp_number), event:events(id,title), team:teams(id,name)')
      .eq('event_id', id)
      .eq('status', 'active')
      .order('date', { ascending: true }),
    supabase
      .from('ride_requests')
      .select('ride_offer_id, status')
      .eq('passenger_id', user.id),
  ])

  if (!eventRaw) notFound()

  const event = eventRaw as ClubEvent
  const rides = (ridesRaw || []) as RideOffer[]
  const myRequests: Record<string, string> = {}
  ;(myReqsRaw || []).forEach((r: { ride_offer_id: string; status: string }) => {
    myRequests[r.ride_offer_id] = r.status
  })

  const color = EVENT_COLORS[event.event_type] || '#6b7280'
  const icon = EVENT_TYPE_ICONS[event.event_type] || '📌'
  const label = EVENT_TYPE_LABELS[event.event_type] || 'Evento'
  const isPast = event.date < new Date().toISOString().split('T')[0]

  const toFieldRides = rides.filter(r => r.direction === 'to_field' || r.direction === 'both')
  const fromFieldRides = rides.filter(r => r.direction === 'from_field' || r.direction === 'both')
  const totalSeats = rides.reduce((s, r) => s + (r.seats_available || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe">

        {/* ── Hero evento ──────────────────────────────────── */}
        <div className="h-2 w-full" style={{ background: color }} />
        <div className="px-4 max-w-2xl mx-auto">

          <div className="py-5">
            {/* Back + Edit */}
            <div className="flex items-center justify-between mb-4">
              <Link href="/events" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
                ← Calendario
              </Link>
              {user.id === event.created_by && (
                <Link
                  href={`/events/${event.id}/edit`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-gray-400 transition-colors">
                  ✏️ Modifica
                </Link>
              )}
            </div>

            {/* Type + team badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${color}18`, color }}>
                {icon} {label}
              </span>
              {event.team && (
                <span className="badge badge-gray">{event.team.name}</span>
              )}
              {isPast && (
                <span className="badge badge-red">Passato</span>
              )}
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-3">{event.title}</h1>

            {/* Info grid */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl w-7 text-center">📅</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {format(new Date(event.date), 'EEEE d MMMM yyyy', { locale: it })}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {format(new Date(event.date), 'EEEE', { locale: it })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl w-7 text-center">⏰</span>
                <p className="font-semibold text-gray-900 text-sm">
                  {event.time_start.slice(0, 5)}
                  {event.time_end ? ` – ${event.time_end.slice(0, 5)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl w-7 text-center">📍</span>
                <p className="font-semibold text-gray-900 text-sm">{event.location}</p>
              </div>
              {event.description && (
                <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                  <span className="text-xl w-7 text-center mt-0.5">📝</span>
                  <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Riepilogo passaggi ────────────────────────────── */}
          <div className="mb-5">
            <div className={`rounded-2xl p-4 flex items-center justify-between ${
              rides.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div>
                <p className={`font-bold text-base ${rides.length > 0 ? 'text-green-800' : 'text-red-700'}`}>
                  {rides.length > 0
                    ? `🚗 ${rides.length} passaggi disponibili`
                    : '⚠️ Nessun passaggio ancora'}
                </p>
                {rides.length > 0 && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {totalSeats} posti totali disponibili
                  </p>
                )}
                {rides.length === 0 && !isPast && (
                  <p className="text-xs text-red-500 mt-0.5">Offri tu il primo passaggio!</p>
                )}
              </div>
              {!isPast && (
                <Link
                  href={`/rides/new?event_id=${event.id}`}
                  className="btn-primary text-sm px-4 py-2 min-h-0 rounded-xl flex-shrink-0">
                  + Offri
                </Link>
              )}
            </div>
          </div>

          {/* ── Passaggi al campo ─────────────────────────────── */}
          {toFieldRides.length > 0 && (
            <section className="mb-5">
              <h2 className="section-title flex items-center gap-2">
                <span>→</span> Al campo
                <span className="badge badge-green ml-1">{toFieldRides.length}</span>
              </h2>
              <div className="space-y-3">
                {toFieldRides.map(r => (
                  <RideCard
                    key={r.id}
                    offer={r}
                    myRequestStatus={myRequests[r.id] || null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Passaggi da campo ─────────────────────────────── */}
          {fromFieldRides.length > 0 && (
            <section className="mb-5">
              <h2 className="section-title flex items-center gap-2">
                <span>←</span> Dal campo
                <span className="badge badge-blue ml-1">{fromFieldRides.length}</span>
              </h2>
              <div className="space-y-3">
                {fromFieldRides.map(r => (
                  <RideCard
                    key={r.id}
                    offer={r}
                    myRequestStatus={myRequests[r.id] || null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Empty state ───────────────────────────────────── */}
          {rides.length === 0 && !isPast && (
            <div className="card p-10 text-center mb-5">
              <p className="text-5xl mb-3">🚗</p>
              <p className="text-gray-500 font-medium mb-1">Nessun passaggio per questo evento</p>
              <p className="text-gray-400 text-sm mb-4">Stai andando al campo? Offri un passaggio ai tuoi compagni!</p>
              <Link href={`/rides/new?event_id=${event.id}`} className="btn-primary inline-flex text-sm">
                Offri passaggio per questo evento
              </Link>
            </div>
          )}

          {/* ── Link cerca passaggio generico ────────────────── */}
          {!isPast && (
            <Link href={`/rides?event=${event.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Cerca passaggio</p>
                  <p className="text-xs text-gray-400">Filtra tutti i passaggi per questo evento</p>
                </div>
              </div>
              <span className="text-gray-400 text-lg">→</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
