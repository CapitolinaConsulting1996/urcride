'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { ClubEvent, Team } from '@/types'

function NewRideForm() {
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [returnTime, setReturnTime] = useState('')
  const [seats, setSeats] = useState(2)
  const [price, setPrice] = useState(0)
  const [direction, setDirection] = useState<'to_field' | 'from_field' | 'both'>('to_field')
  const [eventId, setEventId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [hasLuggage, setHasLuggage] = useState(false)
  const [preferences, setPreferences] = useState('')
  const [notes, setNotes] = useState('')
  const [originAddress, setOriginAddress] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const presetEvent = searchParams.get('event_id')
    if (presetEvent) setEventId(presetEvent)

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: evts }, { data: tms }, { data: prof }] = await Promise.all([
        supabase.from('events').select('id,title,date').gte('date', today).order('date').limit(20),
        supabase.from('teams').select('*').order('name'),
        supabase.from('profiles').select('address, team_id').eq('id', user.id).single(),
      ])
      setEvents((evts || []) as ClubEvent[])
      setTeams((tms || []) as Team[])
      if (prof?.address) setOriginAddress(prof.address)
      if (prof?.team_id) setTeamId(prof.team_id)
    }
    init()
  }, [])

  // Auto-fill date from event
  useEffect(() => {
    if (eventId) {
      const ev = events.find(e => e.id === eventId)
      if (ev) setDate(ev.date)
    }
  }, [eventId, events])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error: err } = await supabase.from('ride_offers').insert({
      driver_id: user.id,
      date,
      time_departure: time,
      return_time: (direction === 'from_field' || direction === 'both') ? returnTime || null : null,
      seats_available: seats,
      seats_total: seats,
      price_per_seat: price,
      direction,
      event_id: eventId || null,
      team_id: teamId || null,
      has_luggage: hasLuggage,
      preferences: preferences || null,
      notes: notes || null,
      origin_address: originAddress || null,
      status: 'active',
    })

    if (err) {
      setError('Errore durante la creazione: ' + err.message)
      setLoading(false)
      return
    }

    router.push('/my-rides')
  }

  const directionOptions = [
    { value: 'to_field', label: '→ Al campo', desc: 'Parto da casa, vado al campo' },
    { value: 'from_field', label: '← A casa', desc: 'Parto dal campo, torno a casa' },
    { value: 'both', label: '↔ Andata e ritorno', desc: 'Porto e riprendo' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/rides" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <h1 className="text-xl font-black text-gray-900">Offri un passaggio</h1>
        </div>

        {/* Destination info */}
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0f3d1e, #1a5c2e)' }}>
          <span className="text-2xl">🏉</span>
          <div className="text-white">
            <p className="font-bold text-sm">Campo URC — Unione Rugby Capitolina</p>
            <p className="text-white/70 text-xs">Via Flaminia 867, Roma</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Direzione */}
          <div className="card p-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
              Direzione
            </label>
            <div className="space-y-2">
              {directionOptions.map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  direction === opt.value ? 'border-[#1a5c2e] bg-green-50' : 'border-gray-200 bg-white'
                }`}>
                  <input type="radio" name="direction" value={opt.value}
                    checked={direction === opt.value}
                    onChange={() => setDirection(opt.value as typeof direction)}
                    className="w-4 h-4 accent-[#1a5c2e]" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Data e orari */}
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data *</label>
                <input type="date" required min={today} value={date}
                  onChange={e => setDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  {direction === 'from_field' ? 'Ora partenza dal campo' : 'Ora di partenza'}
                </label>
                <input type="time" required value={time}
                  onChange={e => setTime(e.target.value)} className="input" />
              </div>
            </div>

            {(direction === 'both') && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ora ritorno dal campo</label>
                <input type="time" value={returnTime}
                  onChange={e => setReturnTime(e.target.value)} className="input" />
              </div>
            )}
          </div>

          {/* Evento e squadra */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Evento collegato</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className="input">
                <option value="">Nessun evento specifico</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} — {ev.date}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Squadra</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="input">
                <option value="">Tutte / Nessuna</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Posti e prezzo */}
          <div className="card p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                Posti disponibili: <span className="font-bold text-gray-900">{seats}</span>
              </label>
              <input type="range" min={1} max={6} value={seats}
                onChange={e => setSeats(parseInt(e.target.value))}
                className="w-full accent-[#1a5c2e]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                {[1,2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                Prezzo per passeggero: <span className="font-bold text-gray-900">
                  {price === 0 ? 'Gratuito 🆓' : `€${price}`}
                </span>
              </label>
              <input type="range" min={0} max={20} step={0.5} value={price}
                onChange={e => setPrice(parseFloat(e.target.value))}
                className="w-full accent-[#1a5c2e]" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Gratis</span><span>€5</span><span>€10</span><span>€15</span><span>€20</span>
              </div>
            </div>
          </div>

          {/* Dettagli aggiuntivi */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Punto di partenza</label>
              <input type="text" value={originAddress} onChange={e => setOriginAddress(e.target.value)}
                placeholder="es. Via Salaria 50, Prati, Roma" className="input" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Preferenze</label>
              <input type="text" value={preferences} onChange={e => setPreferences(e.target.value)}
                placeholder="es. No fumo, musica ok, puntualità" className="input" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Note aggiuntive</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Informazioni extra per i passeggeri..."
                className="input h-16 resize-none" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasLuggage} onChange={e => setHasLuggage(e.target.checked)}
                className="w-4 h-4 accent-[#1a5c2e]" />
              <span className="text-sm font-medium text-gray-700">Spazio per bagagli / borse</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !date}
            className="btn-primary w-full">
            {loading ? 'Pubblicazione...' : '🚗 Pubblica passaggio'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default function NewRidePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-gray-400">Caricamento...</p>
      </div>
    }>
      <NewRideForm />
    </Suspense>
  )
}
