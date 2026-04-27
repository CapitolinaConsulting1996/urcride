import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import EventCard from '@/components/ui/EventCard'
import type { ClubEvent, Team } from '@/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '@/types'

export const dynamic = 'force-dynamic'

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; team?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('events')
    .select(`
      *,
      team:teams(name),
      rides_count:ride_offers(count)
    `)
    .gte('date', today)
    .order('date', { ascending: true })

  if (params.type) query = query.eq('event_type', params.type)
  if (params.team) query = query.eq('team_id', params.team)

  const [{ data: eventsRaw }, { data: teams }] = await Promise.all([
    query,
    supabase.from('teams').select('*').order('name'),
  ])

  // Normalize rides_count from Supabase aggregate
  const events: ClubEvent[] = (eventsRaw || []).map((e: ClubEvent & { rides_count?: { count: number }[] }) => ({
    ...e,
    rides_count: Array.isArray(e.rides_count) ? (e.rides_count[0]?.count ?? 0) : (e.rides_count ?? 0),
  }))

  const eventTypes = Object.entries(EVENT_TYPE_LABELS)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-2xl mx-auto">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-gray-900">Calendario eventi</h1>
          <div className="flex items-center gap-2">
            <span className="badge badge-green">{events.length} prossimi</span>
            <Link
              href="/events/new"
              className="btn-primary text-xs px-3 py-1.5 min-h-0 rounded-lg">
              + Nuovo
            </Link>
          </div>
        </div>

        {/* ── Filtri tipo evento ────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
          <Link
            href="/events"
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !params.type ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
            style={!params.type ? { background: '#1a5c2e' } : {}}>
            Tutti
          </Link>
          {eventTypes.map(([type, label]) => (
            <Link
              key={type}
              href={`/events?type=${type}${params.team ? `&team=${params.team}` : ''}`}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                params.type === type ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
              style={params.type === type ? { background: '#1a5c2e' } : {}}>
              <span>{EVENT_TYPE_ICONS[type as keyof typeof EVENT_TYPE_ICONS]}</span>
              {label}
            </Link>
          ))}
        </div>

        {/* ── Filtro squadra ────────────────────────────────── */}
        {teams && teams.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
            <Link
              href={`/events${params.type ? `?type=${params.type}` : ''}`}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !params.team ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}>
              Tutte le squadre
            </Link>
            {(teams as Team[]).map(t => (
              <Link
                key={t.id}
                href={`/events?team=${t.id}${params.type ? `&type=${params.type}` : ''}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  params.team === t.id ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
                }`}>
                {t.name}
              </Link>
            ))}
          </div>
        )}

        {/* ── Lista eventi ──────────────────────────────────── */}
        {events.length === 0 ? (
          <div className="card p-10 text-center mt-4">
            <p className="text-5xl mb-3">📅</p>
            <p className="text-gray-500 font-medium">Nessun evento trovato</p>
            <p className="text-gray-400 text-sm mt-1">Prova a cambiare i filtri</p>
            <Link href="/events" className="btn-ghost mt-4 inline-flex text-sm">
              Rimuovi filtri
            </Link>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
