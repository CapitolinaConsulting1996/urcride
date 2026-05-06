'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { Team, ClubEvent, RecurrenceType } from '@/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS, RECURRENCE_LABELS } from '@/types'

type EditScope = 'single' | 'all_future'

export default function EditEventPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<ClubEvent | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editScope, setEditScope] = useState<EditScope>('single')

  const [form, setForm] = useState({
    title: '',
    event_type: 'training',
    date: '',
    time_start: '',
    time_end: '',
    location: '',
    description: '',
    team_id: '',
    recurrence: 'none' as RecurrenceType,
    recurrence_end_date: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: ev }, { data: tms }] = await Promise.all([
        supabase.from('events').select('*').eq('id', params.id).single(),
        supabase.from('teams').select('*').order('name'),
      ])

      if (!ev) { router.push('/events'); return }

      const e = ev as ClubEvent
      setEvent(e)
      setTeams((tms || []) as Team[])
      setForm({
        title: e.title,
        event_type: e.event_type,
        date: e.date,
        time_start: e.time_start.slice(0, 5),
        time_end: e.time_end ? e.time_end.slice(0, 5) : '',
        location: e.location,
        description: e.description || '',
        team_id: e.team_id || '',
        recurrence: e.recurrence || 'none',
        recurrence_end_date: e.recurrence_end_date || '',
      })
      setLoading(false)
    }
    load()
  }, [params.id])

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!event) return
    setSaving(true)

    const patch = {
      title: form.title,
      event_type: form.event_type,
      date: form.date,
      time_start: form.time_start,
      time_end: form.time_end || null,
      location: form.location,
      description: form.description || null,
      team_id: form.team_id || null,
    }

    if (editScope === 'single' || !event.recurrence_group_id) {
      const { error } = await supabase.from('events').update(patch).eq('id', event.id)
      if (error) { alert('Errore: ' + error.message); setSaving(false); return }
    } else {
      // Aggiorna questo evento
      const { error: e1 } = await supabase.from('events').update(patch).eq('id', event.id)
      // Aggiorna tutti i futuri della stessa serie (stesso giorno della settimana, stessa ora)
      const { error: e2 } = await supabase.from('events')
        .update({
          title: form.title,
          event_type: form.event_type,
          time_start: form.time_start,
          time_end: form.time_end || null,
          location: form.location,
          description: form.description || null,
          team_id: form.team_id || null,
        })
        .eq('recurrence_group_id', event.recurrence_group_id)
        .gt('date', event.date)

      if (e1 || e2) {
        alert('Errore: ' + (e1?.message || e2?.message))
        setSaving(false)
        return
      }
    }

    router.push(`/events/${event.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <main className="pt-4 md:pt-20 px-4 max-w-lg mx-auto">
          <div className="card p-10 text-center mt-8">
            <p className="text-gray-400">Caricamento...</p>
          </div>
        </main>
      </div>
    )
  }

  const isRecurring = !!event?.recurrence_group_id

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/events/${params.id}`} className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <h1 className="text-xl font-black text-gray-900">Modifica evento</h1>
        </div>

        {/* Scopo modifica per eventi ricorrenti */}
        {isRecurring && (
          <div className="card p-4 mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
              Cosa vuoi modificare?
            </label>
            <div className="space-y-2">
              {([
                ['single',     '📅', 'Solo questo evento'],
                ['all_future', '🔁', 'Questo e tutti i futuri della serie'],
              ] as [EditScope, string, string][]).map(([value, icon, label]) => (
                <button key={value} type="button" onClick={() => setEditScope(value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                    editScope === value
                      ? 'border-[#1a5c2e] bg-[#1a5c2e]/5 text-[#1a5c2e]'
                      : 'border-gray-200 text-gray-600'
                  }`}>
                  <span className="text-lg">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">

          {/* Tipo evento */}
          <div className="card p-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
              Tipo evento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
                <button key={type} type="button" onClick={() => set('event_type', type)}
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
              <label className="text-xs font-medium text-gray-500 mb-1 block">Titolo *</label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                className="input" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data *</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="input" required
                  disabled={isRecurring && editScope === 'all_future'} />
                {isRecurring && editScope === 'all_future' && (
                  <p className="text-xs text-gray-400 mt-1">La data non cambia per i futuri</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Squadra</label>
                <select value={form.team_id} onChange={e => set('team_id', e.target.value)} className="input">
                  <option value="">Tutte</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ora inizio *</label>
                <input type="time" value={form.time_start} onChange={e => set('time_start', e.target.value)}
                  className="input" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ora fine</label>
                <input type="time" value={form.time_end} onChange={e => set('time_end', e.target.value)}
                  className="input" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Luogo *</label>
              <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                className="input" required />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Descrizione</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Note aggiuntive..." className="input h-20 resize-none" />
            </div>
          </div>

          {/* Info ricorrenza (sola lettura) */}
          {isRecurring && (
            <div className="card p-4 flex items-center gap-3">
              <span className="text-2xl">🔁</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {RECURRENCE_LABELS[form.recurrence]}
                </p>
                {form.recurrence_end_date && (
                  <p className="text-xs text-gray-400">
                    Fino al {new Date(form.recurrence_end_date).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link href={`/events/${params.id}`}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-600 text-center">
              Annulla
            </Link>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
