'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { RideOffer, UserProfile, MatchSuggestion } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { rankOffers } from '@/lib/matching'

type Tab = 'available' | 'mine' | 'matches'

export default function RidesPage() {
  const [tab, setTab] = useState<Tab>('matches')
  const [offers, setOffers] = useState<RideOffer[]>([])
  const [myOffers, setMyOffers] = useState<RideOffer[]>([])
  const [matches, setMatches] = useState<MatchSuggestion[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [showRequestModal, setShowRequestModal] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [
      { data: profile },
      { data: allOffers },
      { data: schedules },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('ride_offers')
        .select('*, driver:profiles(*), requests:ride_requests(*, passenger:profiles(*))')
        .eq('status', 'active')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true }),
      supabase.from('training_schedules').select('*').eq('user_id', user.id),
    ])

    if (profile) setCurrentUser(profile as UserProfile)

    const all = (allOffers || []) as Array<RideOffer & { driver: UserProfile }>
    setOffers(all.filter(o => o.driver_id !== user.id))
    setMyOffers(all.filter(o => o.driver_id === user.id))

    // Calcola matches (usa primo orario come preferenza)
    if (profile && schedules?.length) {
      const today = new Date().toISOString().split('T')[0]
      const firstSchedule = schedules[0]
      const ranked = await rankOffers({
        passenger: profile as UserProfile,
        passenger_schedules: schedules,
        offers: all.filter(o => o.driver_id !== user.id),
        target_date: today,
        target_time: firstSchedule.time_start,
      })
      setMatches(ranked)
    }

    setLoading(false)
  }

  async function requestRide(offerId: string) {
    if (!currentUser) return
    setRequestingId(offerId)
    const { error } = await supabase.from('ride_requests').insert({
      ride_offer_id: offerId,
      passenger_id: currentUser.id,
      message: requestMessage || null,
    })
    if (!error) {
      setShowRequestModal(null)
      setRequestMessage('')
      loadData()
    }
    setRequestingId(null)
  }

  async function handleRequest(offer: RideOffer, e: React.MouseEvent) {
    e.preventDefault()
    setShowRequestModal(offer.id)
  }

  async function cancelOffer(offerId: string) {
    await supabase.from('ride_offers').update({ status: 'cancelled' }).eq('id', offerId)
    loadData()
  }

  async function handleRequestAction(reqId: string, status: 'accepted' | 'rejected') {
    await supabase.from('ride_requests').update({ status }).eq('id', reqId)
    loadData()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">🚗</div>
        <p className="text-gray-500">Caricamento passaggi...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Passaggi</h1>
          <Link href="/rides/new"
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: '#1a5c2e' }}>
            + Offri passaggio
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-5">
          {([
            { key: 'matches', label: '⭐ Suggeriti' },
            { key: 'available', label: '🚗 Disponibili' },
            { key: 'mine', label: '📋 I miei' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Matches suggeriti */}
        {tab === 'matches' && (
          <div className="space-y-3">
            {matches.length === 0 ? (
              <EmptyState icon="⭐" text="Aggiungi i tuoi orari di allenamento nel profilo per ricevere suggerimenti personalizzati" />
            ) : (
              matches.map(m => (
                <RideCard
                  key={m.offer.id}
                  offer={m.offer}
                  matchInfo={m}
                  currentUserId={currentUser?.id}
                  onRequest={handleRequest}
                />
              ))
            )}
          </div>
        )}

        {/* Tab: Disponibili */}
        {tab === 'available' && (
          <div className="space-y-3">
            {offers.length === 0 ? (
              <EmptyState icon="🚗" text="Nessun passaggio disponibile al momento" />
            ) : (
              offers.map(offer => (
                <RideCard
                  key={offer.id}
                  offer={offer}
                  currentUserId={currentUser?.id}
                  onRequest={handleRequest}
                />
              ))
            )}
          </div>
        )}

        {/* Tab: I miei */}
        {tab === 'mine' && (
          <div className="space-y-3">
            {myOffers.length === 0 ? (
              <EmptyState icon="📋" text="Non hai ancora offerto passaggi">
                <Link href="/rides/new" className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-semibold inline-block"
                  style={{ background: '#1a5c2e' }}>
                  Offri il tuo primo passaggio
                </Link>
              </EmptyState>
            ) : (
              myOffers.map(offer => (
                <MyRideCard
                  key={offer.id}
                  offer={offer}
                  onCancel={() => cancelOffer(offer.id)}
                  onRequestAction={handleRequestAction}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal richiesta passaggio */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-3">Richiedi passaggio</h3>
            <textarea
              value={requestMessage}
              onChange={e => setRequestMessage(e.target.value)}
              placeholder="Messaggio opzionale per il driver..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRequestModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                Annulla
              </button>
              <button
                onClick={() => requestRide(showRequestModal)}
                disabled={requestingId === showRequestModal}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: '#1a5c2e' }}>
                {requestingId === showRequestModal ? 'Invio...' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RideCard({
  offer,
  matchInfo,
  currentUserId,
  onRequest,
}: {
  offer: RideOffer & { driver?: UserProfile }
  matchInfo?: MatchSuggestion
  currentUserId?: string
  onRequest: (offer: RideOffer, e: React.MouseEvent) => void
}) {
  const hasRequested = (offer.requests as RideRequest[] | undefined)?.some(
    r => r.passenger_id === currentUserId
  )
  const myRequest = (offer.requests as RideRequest[] | undefined)?.find(
    r => r.passenger_id === currentUserId
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {matchInfo && (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-3 ${
          matchInfo.is_on_the_way ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
        }`}>
          {matchInfo.is_on_the_way ? '✓ Di passaggio' : `+${matchInfo.detour_km.toFixed(1)} km deviazione`}
          <span className="ml-1 text-xs">· Score {Math.round(matchInfo.match_score)}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
              {offer.driver?.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{offer.driver?.full_name}</p>
              <p className="text-xs text-gray-400">📍 {offer.driver?.address?.split(',')[0]}</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mt-2">
            📅 {format(new Date(offer.date), 'EEEE d MMMM', { locale: it })} · {offer.time_departure}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              💺 {offer.seats_available}/{offer.seats_total} posti
            </span>
            <span className={`text-xs font-semibold ${
              offer.price_per_seat > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {offer.price_per_seat > 0 ? `💶 €${offer.price_per_seat}/persona` : '🆓 Gratuito'}
            </span>
          </div>
          {offer.notes && <p className="text-xs text-gray-400 mt-1 italic">"{offer.notes}"</p>}
        </div>

        <div className="flex-shrink-0">
          {hasRequested ? (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              myRequest?.status === 'accepted' ? 'bg-green-100 text-green-700' :
              myRequest?.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-600'
            }`}>
              {myRequest?.status === 'accepted' ? '✓ Accettato' :
               myRequest?.status === 'pending' ? '⏳ Richiesto' : '✗ Rifiutato'}
            </span>
          ) : (
            <button onClick={e => onRequest(offer, e)}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ background: '#1a5c2e' }}>
              Richiedi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type RideRequest = {
  id: string
  passenger_id: string
  status: string
  message: string | null
  passenger?: UserProfile
}

function MyRideCard({
  offer,
  onCancel,
  onRequestAction,
}: {
  offer: RideOffer & { requests?: RideRequest[] }
  onCancel: () => void
  onRequestAction: (reqId: string, status: 'accepted' | 'rejected') => void
}) {
  const pendingRequests = offer.requests?.filter(r => r.status === 'pending') || []
  const acceptedRequests = offer.requests?.filter(r => r.status === 'accepted') || []

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-sm text-gray-800">
            {format(new Date(offer.date), 'EEEE d MMMM', { locale: it })} · {offer.time_departure}
          </p>
          <p className="text-xs text-gray-500">
            💺 {offer.seats_available}/{offer.seats_total} posti ·{' '}
            {offer.price_per_seat > 0 ? `€${offer.price_per_seat}/persona` : 'Gratuito'}
          </p>
        </div>
        <button onClick={onCancel}
          className="text-xs text-red-400 hover:text-red-600 font-medium">
          Cancella
        </button>
      </div>

      {acceptedRequests.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-green-700 mb-1">✓ Passeggeri confermati:</p>
          {acceptedRequests.map(r => (
            <p key={r.id} className="text-xs text-gray-600 ml-2">• {r.passenger?.full_name}</p>
          ))}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-2">⏳ Richieste in attesa:</p>
          {pendingRequests.map(r => (
            <div key={r.id} className="flex items-center justify-between mb-2 bg-amber-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{r.passenger?.full_name}</p>
                {r.message && <p className="text-xs text-gray-500">{r.message}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onRequestAction(r.id, 'accepted')}
                  className="px-2.5 py-1 bg-green-500 text-white text-xs rounded-lg font-semibold">✓</button>
                <button onClick={() => onRequestAction(r.id, 'rejected')}
                  className="px-2.5 py-1 bg-red-400 text-white text-xs rounded-lg font-semibold">✗</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, text, children }: { icon: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-gray-500 text-sm max-w-xs mx-auto">{text}</p>
      {children}
    </div>
  )
}
