'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { Team, RecurrenceType } from '@/types'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS, RECURRENCE_LABELS } from '@/types'

function generateDates(start: string, recurrence: RecurrenceType, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start)
  const last = new Date(end)
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0])
    if (recurrence === 'weekly')    cur.setDate(cur.getDate() + 7)
    else if (recurrence === 'biweekly') cur.setDate(cur.getDate() + 14)
    else if (recurrence === 'monthly')  cur.setMonth(cur.getMonth() + 1)
    else break
  }
  return dates
}

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
    recurrence: 'none' as RecurrenceType,
    recurrence_end_date: '',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/auth/login')
    })
    supabase.from('teams').select('*').order('name').then(({ data }) => {
      setTeams((data || []) as Team[])
    })
  }, [])

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const isRecurring = form.recurrence !== 'none'
  const previewCount =
    isRecurring && form.date && form.recurrence_end_date
      ? generateDates(form.date, form.recurrence, form.recurrence_end_date).length
      : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const base = {
      title: form.title,
      event_type: form.event_type,
      time_start: form.time_start,
      time_end: form.time_end || null,
      location: form.location,
      description: form.description || null,
      team_id: form.team_id || null,
      recurrence: form.recurrence,
      recurrence_end_date: isRecurring ? form.recurrence_end_date || null : null,
      created_by: user.id,
    }

    if (!isRecurring) {
      const { error } = await supabase.from('events').insert({ ...base, date: form.date })
      if (error) { alert('Errore: ' + error.message); setLoading(false); return }
    } else {
      const groupId = crypto.randomUUID()
      const dates = generateDates(form.date, form.recurrence, form.recurrence_end_date)
      const rows = dates.map(date => ({
        ...base,
        date,
        recurrence_group_id: groupId,
      }))
      const { error } = await supabase.from('events').insert(rows)
      if (error) { alert('Errore: ' + error.message); setLoading(false); return }
    }

    router.push('/events')
  }

  const canSubmit =
    form.title && form.date && form.time_start &&
    (!isRecurring || form.recurrence_end_date)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/events" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <h1 className="text-xl font-black text-gray-900">Nuovo evento</h1>
        </div>

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
                placeholder="es. Allenamento Under 14" className="input" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  {isRecurring ? 'Prima data *' : 'Data *'}
                </label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="input" required />
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
                placeholder="Note aggiuntive, cosa portare, ecc."
                className="input h-20 resize-none" />
            </div>
          </div>

          {/* Ricorrenza */}
          <div className="card p-4 space-y-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
              Ripetizione
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([value, label]) => (
                <button key={value} type="button" onClick={() => set('recurrence', value)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-left ${
                    form.recurrence === value
                      ? 'border-[#1a5c2e] bg-[#1a5c2e]/5 text-[#1a5c2e]'
                      : 'border-gray-200 text-gray-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {isRecurring && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ripeti fino al *</label>
                <input type="date" value={form.recurrence_end_date}
                  min={form.date || undefined}
                  onChange={e => set('recurrence_end_date', e.target.value)}
                  className="input" required={isRecurring} />
                {previewCount > 0 && (
                  <p className="text-xs font-medium mt-1.5" style={{ color: '#1a5c2e' }}>
                    Verranno creati {previewCount} eventi
                  </p>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || !canSubmit} className="btn-primary w-full">
            {loading
              ? 'Salvataggio...'
              : isRecurring
                ? `Crea serie (${previewCount > 0 ? previewCount : '…'} eventi)`
                : 'Crea evento'}
          </button>
        </form>
      </main>
    </div>
  )
}
