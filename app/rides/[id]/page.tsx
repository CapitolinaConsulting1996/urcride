'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { RideOffer, RideRequest, UserProfile } from '@/types'
import { DIRECTION_LABELS, LIVE_STATUS_LABELS } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { buildWhatsAppLink } from '@/lib/matching'

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [offer, setOffer] = useState<RideOffer | null>(null)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [myRequest, setMyRequest] = useState<RideRequest | null>(null)
  const [passengers, setPassengers] = useState<RideRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [reqMsg, setReqMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [liveStatus, setLiveStatus] = useState<string>('not_started')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: profile }, { data: rideData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('ride_offers')
        .select(`*,
          driver:profiles(*),
          event:events(id,title,event_type,date,time_start,location),
          team:teams(name),
          requests:ride_requests(*, passenger:profiles(id,full_name,zone,address,phone,whatsapp_number,rating_avg))
        `)
        .eq('id', id)
        .single(),
    ])

    if (profile) setCurrentUser(profile as UserProfile)
    if (rideData) {
      const ride = rideData as RideOffer
      setOffer(ride)
      setLiveStatus(ride.live_status || 'not_started')
      const reqs = (ride.requests || []) as RideRequest[]
      setPassengers(reqs.filter(r => r.status === 'accepted'))
      const mine = reqs.find(r => r.passenger_id === user.id)
      if (mine) setMyRequest(mine)
    }
    setLoading(false)
  }

  async function requestRide() {
    if (!currentUser || !offer) return
    setSending(true)
    await supabase.from('ride_requests').insert({
      ride_offer_id: offer.id,
      passenger_id: currentUser.id,
      message: reqMsg || null,
    })
    setSending(false)
    setShowModal(false)
    load()
  }

  async function cancelRequest() {
    if (!myRequest) return
    await supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', myRequest.id)
    load()
  }

  async function handleRequest(reqId: string, status: 'accepted' | 'rejected') {
    await supabase.from('ride_requests').update({ status }).eq('id', reqId)
    load()
  }

  async function updateLiveStatus(status: string) {
    if (!offer) return
    await supabase.from('ride_offers').update({ live_status: status }).eq('id', offer.id)
    setLiveStatus(status)
    if (status === 'completed') {
      await supabase.from('ride_offers').update({ status: 'completed' }).eq('id', offer.id)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center"><div className="text-5xl mb-3">🚗</div><p className="text-gray-400">Caricamento...</p></div>
    </div>
  )
  if (!offer) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-3">❓</p>
        <p className="text-gray-500">Passaggio non trovato</p>
        <Link href="/rides" className="btn-primary mt-4 inline-flex text-sm">← Torna ai passaggi</Link>
      </div>
    </div>
  )

  const isDriver = currentUser?.id === offer.driver_id
  const isFree = offer.price_per_seat === 0
  const pendingRequests = (offer.requests || []).filter(r => r.status === 'pending') as RideRequest[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-xl font-bold">←</button>
        <h1 className="font-bold text-gray-900 flex-1 truncate">Dettaglio passaggio</h1>
        {offer.event && (
          <span className="badge badge-green text-xs">{offer.event.title}</span>
        )}
      </div>

      <main className="pb-safe px-4 max-w-lg mx-auto pt-4 space-y-4">

        {/* ── Driver card ─────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
              style={{ background: '#1a5c2e' }}>
              {offer.driver?.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 text-lg">{offer.driver?.full_name}</h2>
                {offer.driver?.is_verified && (
                  <span className="badge badge-blue text-xs">✓ Verificato</span>
                )}
              </div>
              {(offer.driver?.rating_avg ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                  <span>⭐ {offer.driver?.rating_avg?.toFixed(1)}</span>
                  <span>·</span>
                  <span>{offer.driver?.trips_completed} viaggi</span>
                </div>
              )}
              {offer.driver?.bio && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{offer.driver.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Tragitto ────────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-4">Tragitto</h3>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-0.5 flex-1 bg-gray-200 my-2 min-h-[24px]" />
              <div className="w-3 h-3 rounded-full" style={{ background: '#1a5c2e' }} />
            </div>
            <div className="flex-1 space-y-5">
              <div>
                <p className="font-semibold text-gray-900">
                  {offer.driver?.zone || offer.driver?.address?.split(',')[0] || 'Partenza'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{offer.driver?.address}</p>
              </div>
              <div>
                <p className="font-semibold" style={{ color: '#1a5c2e' }}>Campo URC — Via Flaminia 867</p>
                <p className="text-xs text-gray-400 mt-0.5">Roma, 00191</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dettagli ────────────────────────────────────── */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-4">Dettagli viaggio</h3>
          <div className="space-y-3">
            {[
              { icon: '📅', label: 'Data', value: format(new Date(offer.date), 'EEEE d MMMM yyyy', { locale: it }) },
              { icon: '⏰', label: 'Partenza', value: offer.time_departure },
              { icon: '↔️', label: 'Direzione', value: DIRECTION_LABELS[offer.direction] },
              { icon: '💺', label: 'Posti', value: `${offer.seats_available} disponibili su ${offer.seats_total}` },
              { icon: '💶', label: 'Costo', value: isFree ? '🆓 Gratuito' : `€${offer.price_per_seat} per persona` },
              ...(offer.has_luggage ? [{ icon: '🎒', label: 'Borsoni', value: 'Accettati' }] : []),
              ...(offer.event ? [{ icon: '🏉', label: 'Evento', value: offer.event.title }] : []),
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
                <span className="text-sm text-gray-500 w-20 flex-shrink-0">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          {offer.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 italic">"{offer.notes}"</p>
            </div>
          )}
        </div>

        {/* ── Live status (solo driver) ────────────────────── */}
        {isDriver && offer.status === 'active' && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Stato viaggio</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['not_started', 'departing', 'on_way', 'completed'] as const).map(s => (
                <button key={s} onClick={() => updateLiveStatus(s)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                    liveStatus === s
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                  style={liveStatus === s ? { background: '#1a5c2e', borderColor: '#1a5c2e' } : {}}>
                  {LIVE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Passeggeri confermati ────────────────────────── */}
        {passengers.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">
              Passeggeri confermati ({passengers.length})
            </h3>
            <div className="space-y-3">
              {passengers.map(req => (
                <div key={req.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: '#1a5c2e' }}>
                    {req.passenger?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{req.passenger?.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {req.passenger?.zone || req.passenger?.address?.split(',')[0]}
                    </p>
                  </div>
                  {req.passenger?.whatsapp_number && (
                    <a href={buildWhatsAppLink(req.passenger.whatsapp_number, req.passenger.full_name, offer.date, offer.time_departure)}
                      target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0"
                      style={{ background: '#25D366' }}>
                      💬
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Richieste pendenti (solo driver) ─────────────── */}
        {isDriver && pendingRequests.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">
              Richieste in attesa ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-amber-50 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm text-gray-900">{req.passenger?.full_name}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req.id, 'accepted')}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg font-semibold">✓ OK</button>
                      <button onClick={() => handleRequest(req.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-400 text-white text-xs rounded-lg font-semibold">✗ No</button>
                    </div>
                  </div>
                  {req.message && <p className="text-xs text-gray-500 italic">"{req.message}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Azioni passeggero ────────────────────────────── */}
        {!isDriver && (
          <div className="space-y-3">
            {!myRequest && offer.seats_available > 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary w-full">
                ✓ Richiedi posto
              </button>
            )}
            {!myRequest && offer.seats_available === 0 && (
              <button className="btn-secondary w-full">📋 Entra in lista attesa</button>
            )}
            {myRequest && (
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">La tua richiesta</p>
                  <p className="text-xs text-gray-400 mt-0.5">{myRequest.message}</p>
                </div>
                <span className={`badge ${
                  myRequest.status === 'accepted' ? 'badge-green' :
                  myRequest.status === 'pending'  ? 'badge-gold' : 'badge-red'
                }`}>
                  {myRequest.status === 'accepted' ? '✓ Confermato' :
                   myRequest.status === 'pending'  ? '⏳ In attesa' : '✗ Rifiutato'}
                </span>
              </div>
            )}
            {myRequest?.status === 'pending' && (
              <button onClick={cancelRequest} className="btn-ghost w-full text-red-500 border-red-200">
                Annulla richiesta
              </button>
            )}
            {offer.driver?.whatsapp_number && (
              <a href={buildWhatsAppLink(offer.driver.whatsapp_number, offer.driver.full_name, offer.date, offer.time_departure)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: '#25D366' }}>
                💬 Contatta su WhatsApp
              </a>
            )}
            <Link href={`/messages/${offer.driver_id}`}
              className="btn-secondary w-full flex items-center justify-center gap-2">
              ✉️ Invia messaggio in-app
            </Link>
          </div>
        )}

      </main>

      {/* ── Modal richiesta ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Richiedi posto</h3>
            <p className="text-sm text-gray-500 mb-4">Aggiungi un messaggio per {offer.driver?.full_name}</p>
            <textarea value={reqMsg} onChange={e => setReqMsg(e.target.value)}
              placeholder="es. Passo da Piazza Risorgimento, è sulla strada?"
              className="input text-sm h-20 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Annulla</button>
              <button onClick={requestRide} disabled={sending} className="btn-primary flex-1">
                {sending ? 'Invio...' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
