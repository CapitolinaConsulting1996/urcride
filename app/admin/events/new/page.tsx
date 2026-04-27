'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { Team } from '@/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '@/types'

export default function NewEventPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    event_type: 'training',
    date: '',
    time_start: '',
    time_end: '',
    location: 'Via Flaminia 867, Roma',
    description: '',
    team_id: '',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/dashboard'); return }
      const { data: tms } = await supabase.from('teams').select('*').order('name')
      setTeams((tms || []) as Team[])
    }
    init()
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('events').insert({
      title: form.title,
      event_type: form.event_type,
      date: form.date,
      time_start: form.time_start,
      time_end: form.time_end || null,
      location: form.location,
      description: form.description || null,
      team_id: form.team_id || null,
    })
    if (!error) {
      router.push('/events')
    } else {
      alert('Errore: ' + error.message)
      setLoading(false)
    }
  }

  const eventTypes = Object.entries(EVENT_TYPE_LABELS)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/events" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="text-xl font-black text-gray-900">Crea nuovo evento</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">

          {/* Tipo evento */}
          <div className="card p-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
              Tipo evento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set('event_type', type)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-1 ${
                    form.event_type === type
                      ? 'border-[#1a5c2e] bg-[#1a5c2e]/5 text-[#1a5c2e]'
                      : 'border-gray-200 text-gray-500'
                  }`}>
                  <span className="text-lg">{EVENT_TYPE_ICONS[type as keyof typeof EVENT_TYPE_ICONS]}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dati base */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Titolo evento *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="es. Allenamento Prima Squadra"
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Squadra</label>
                <select value={form.team_id} onChange={e => set('team_id', e.target.value)} className="input">
                  <option value="">Tutte / Nessuna</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ora inizio *</label>
                <input
                  type="time"
                  value={form.time_start}
                  onChange={e => set('time_start', e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ora fine</label>
                <input
                  type="time"
                  value={form.time_end}
                  onChange={e => set('time_end', e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Luogo *</label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Descrizione</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Note aggiuntive, cosa portare, ecc."
                className="input h-20 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.title || !form.date || !form.time_start}
            className="btn-primary w-full">
            {loading ? 'Creazione...' : 'Crea evento'}
          </button>
        </form>
      </main>
    </div>
  )
}
