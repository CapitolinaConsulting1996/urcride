'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'

export default function NewRidePage() {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [seats, setSeats] = useState(2)
  const [price, setPrice] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error: err } = await supabase.from('ride_offers').insert({
      driver_id: user.id,
      date,
      time_departure: time,
      seats_available: seats,
      seats_total: seats,
      price_per_seat: price,
      notes: notes || null,
      status: 'active',
    })

    if (err) {
      setError('Errore durante la creazione del passaggio')
      setLoading(false)
      return
    }

    router.push('/rides')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-24 md:pb-8 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/rides" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="text-xl font-bold text-gray-800">Offri un passaggio</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
            style={{ background: '#f0fdf4' }}>
            <span className="text-2xl">🚗</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Destinazione</p>
              <p className="text-xs text-green-700">Via Flaminia 867, Roma (Campo URC)</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                required
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora di partenza</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posti disponibili: <span className="font-bold text-[#1a5c2e]">{seats}</span>
              </label>
              <input
                type="range"
                min={1}
                max={6}
                value={seats}
                onChange={e => setSeats(parseInt(e.target.value))}
                className="w-full accent-[#1a5c2e]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prezzo per passeggero: <span className="font-bold text-[#1a5c2e]">
                  {price === 0 ? 'Gratuito 🆓' : `€${price}`}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value))}
                className="w-full accent-[#1a5c2e]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Gratis</span><span>€5</span><span>€10</span><span>€15</span><span>€20</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="es. Parto dal Prati, posso passare da Flaminio..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !date}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{ background: '#1a5c2e' }}
            >
              {loading ? 'Pubblicazione...' : '🚗 Pubblica passaggio'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
