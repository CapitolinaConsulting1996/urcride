'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import RideCard from '@/components/ui/RideCard'
import type { RideOffer, UserProfile, ClubEvent, Team } from '@/types'

const MapView = dynamicImport(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl"><p className="text-gray-400">Caricamento mappa...</p></div>,
})

type ViewMode = 'list' | 'map'

export default function RidesPage() {
  const [offers, setOffers] = useState<RideOffer[]>([])
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [showModal, setShowModal] = useState<string | null>(null)
  const [reqMsg, setReqMsg] = useState('')
  const [myRequests, setMyRequests] = useState<Record<string, string>>({})

  // Filters
  const [filterDate, setFilterDate] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterDirection, setFilterDirection] = useState('')
  const [filterFree, setFilterFree] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: profile }, { data: allOffers }, { data: evts }, { data: tms }, { data: reqs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('ride_offers')
        .select('*, driver:profiles(id,full_name,zone,address,rating_avg,trips_completed,is_verified,whatsapp_number), event:events(id,title), team:teams(id,name)')
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true }),
      supabase.from('events').select('*, team:teams(name)').gte('date', today).order('date', { ascending: true }).limit(20),
      supabase.from('teams').select('*').order('name'),
      supabase.from('ride_requests').select('ride_offer_id, status').eq('passenger_id', user.id),
    ])

    if (profile) setCurrentUser(profile as UserProfile)
    setOffers((allOffers || []) as RideOffer[])
    setEvents((evts || []) as ClubEvent[])
    setTeams((tms || []) as Team[])

    const reqMap: Record<string, string> = {}
    ;(reqs || []).forEach((r: { ride_offer_id: string; status: string }) => { reqMap[r.ride_offer_id] = r.status })
    setMyRequests(reqMap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = offers.filter(o => {
    if (filterDate && o.date !== filterDate) return false
    if (filterEvent && o.event_id !== filterEvent) return false
    if (filterTeam && o.team_id !== filterTeam) return false
    if (filterDirection && o.direction !== filterDirection) return false
    if (filterFree && o.price_per_seat !== 0) return false
    return true
  })

  async function requestRide(offerId: string) {
    if (!currentUser) return
    await supabase.from('ride_requests').insert({
      ride_offer_id: offerId,
      passenger_id: currentUser.id,
      message: reqMsg || null,
    })
    setShowModal(null)
    setReqMsg('')
    load()
  }

  const hasFilters = filterDate || filterEvent || filterTeam || filterDirection || filterFree

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center"><div className="text-5xl mb-3">🚗</div><p className="text-gray-400">Caricamento...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="px-4 max-w-2xl mx-auto mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black text-gray-900">Passaggi disponibili</h1>
            <Link href="/rides/new" className="btn-primary text-sm px-4 py-2 min-h-0 rounded-xl">
              + Offri
            </Link>
          </div>

          {/* View toggle */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setView('list')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                view === 'list' ? 'text-white shadow-sm' : 'bg-white text-gray-500'
              }`}
              style={view === 'list' ? { background: '#1a5c2e' } : {}}>
              ☰ Lista
            </button>
            <button onClick={() => setView('map')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                view === 'map' ? 'text-white shadow-sm' : 'bg-white text-gray-500'
              }`}
              style={view === 'map' ? { background: '#1a5c2e' } : {}}>
              🗺️ Mappa
            </button>
          </div>

          {/* Filters */}
          <div className="card p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
                <input type="date" value={filterDate} min={today}
                  onChange={e => setFilterDate(e.target.value)}
                  className="input text-sm py-2 min-h-0" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Direzione</label>
                <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)}
                  className="input text-sm py-2 min-h-0">
                  <option value="">Tutte</option>
                  <option value="to_field">→ Al campo</option>
                  <option value="from_field">← A casa</option>
                  <option value="both">↔ A/R</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Evento</label>
                <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                  className="input text-sm py-2 min-h-0">
                  <option value="">Tutti</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Squadra</label>
                <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
                  className="input text-sm py-2 min-h-0">
                  <option value="">Tutte</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterFree} onChange={e => setFilterFree(e.target.checked)}
                  className="w-4 h-4 accent-[#1a5c2e]" />
                <span className="text-sm font-medium text-gray-700">Solo gratuiti</span>
              </label>
              {hasFilters && (
                <button onClick={() => {
                  setFilterDate(''); setFilterEvent(''); setFilterTeam('');
                  setFilterDirection(''); setFilterFree(false)
                }} className="text-xs text-red-400 hover:text-red-600 font-medium">
                  Rimuovi filtri ✕
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-right">
            {filtered.length} passaggi trovati
          </p>
        </div>

        {/* ── Lista ─────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="px-4 max-w-2xl mx-auto space-y-3">
            {filtered.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-5xl mb-3">🔍</p>
                <p className="text-gray-500 font-medium">Nessun passaggio trovato</p>
                <p className="text-gray-400 text-sm mt-1">Prova a cambiare i filtri o offri tu un passaggio</p>
                <Link href="/rides/new" className="btn-primary mt-4 inline-flex text-sm">
                  Offri un passaggio
                </Link>
              </div>
            ) : (
              filtered.map(offer => (
                <RideCard
                  key={offer.id}
                  offer={offer}
                  onRequest={() => setShowModal(offer.id)}
                  myRequestStatus={myRequests[offer.id] || null}
                />
              ))
            )}
          </div>
        )}

        {/* ── Mappa ─────────────────────────────────────────── */}
        {view === 'map' && (
          <div className="px-4 max-w-2xl mx-auto" style={{ height: '65vh' }}>
            <MapView
              key="rides-map"
              pins={filtered.map(o => ({
                user: o.driver as UserProfile,
                role: o.driver?.role || 'driver',
                schedules: [],
              }))}
              currentUserId={currentUser?.id}
              onMessageUser={uid => router.push(`/messages/${uid}`)}
            />
          </div>
        )}
      </main>

      {/* ── Modal richiesta ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Richiedi passaggio</h3>
            <p className="text-sm text-gray-500 mb-4">Puoi aggiungere un messaggio per il driver</p>
            <textarea
              value={reqMsg}
              onChange={e => setReqMsg(e.target.value)}
              placeholder="es. Sono in Via Salaria 10, può fermarsi?"
              className="input text-sm h-20 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(null)} className="btn-ghost flex-1">Annulla</button>
              <button onClick={() => requestRide(showModal)} className="btn-primary flex-1">Invia richiesta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
