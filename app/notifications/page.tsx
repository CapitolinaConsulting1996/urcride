'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, string>
  read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  ride_request:    '🚗',
  request_accepted:'🎉',
  request_rejected:'❌',
  message:         '💬',
  other:           '🔔',
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifs((data || []) as Notification[])

    // Segna tutte come lette
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(n => n.filter(x => x.id !== id))
  }

  async function clearAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifs([])
  }

  function getLink(n: Notification): string | null {
    if (n.data?.ride_offer_id) return `/rides/${n.data.ride_offer_id}`
    return null
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center"><div className="text-5xl mb-3">🔔</div><p className="text-gray-400">Caricamento...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-black text-gray-900">Notifiche</h1>
          {notifs.length > 0 && (
            <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-600 font-medium">
              Elimina tutte
            </button>
          )}
        </div>

        {notifs.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-5xl mb-3">🔔</p>
            <p className="text-gray-500 font-medium">Nessuna notifica</p>
            <p className="text-gray-400 text-sm mt-1">Ti avviseremo quando ricevi richieste o aggiornamenti</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => {
              const link = getLink(n)
              const icon = TYPE_ICONS[n.type] || TYPE_ICONS.other
              const content = (
                <div className={`card p-4 flex items-start gap-3 transition-all ${
                  !n.read ? 'border-l-4 border-[#1a5c2e]' : ''
                }`}>
                  <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(n.created_at), "d MMM 'alle' HH:mm", { locale: it })}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); deleteNotif(n.id) }}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none">
                    ×
                  </button>
                </div>
              )

              return link ? (
                <Link key={n.id} href={link}>{content}</Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
