'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { MapPin, UserProfile } from '@/types'

// Carica la mappa solo lato client (Leaflet non supporta SSR)
const MapView = dynamicImport(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="text-center">
        <div className="text-4xl mb-2">🗺️</div>
        <p className="text-gray-500 text-sm">Caricamento mappa...</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  const [pins, setPins] = useState<MapPin[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapKey, setMapKey] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()

    // Carica tutti i profili con le loro info
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .not('lat', 'eq', 0)
      .not('lng', 'eq', 0)

    if (!profiles) { setLoading(false); return }

    // Carica orari
    const { data: schedules } = await supabase
      .from('training_schedules')
      .select('*')

    // Carica profili rider
    const { data: riderProfiles } = await supabase
      .from('rider_profiles')
      .select('*')

    const mapPins: MapPin[] = profiles.map(profile => ({
      user: profile as UserProfile,
      role: profile.role,
      schedules: (schedules || []).filter(s => s.user_id === profile.id),
      rider_profile: (riderProfiles || []).find(r => r.user_id === profile.id),
    }))

    if (user) {
      const myProfile = profiles.find(p => p.id === user.id)
      if (myProfile) setCurrentUser(myProfile as UserProfile)
    }

    setPins(mapPins)
    setMapKey(k => k + 1)
    setLoading(false)
  }

  function handleMessageUser(userId: string) {
    router.push(`/messages/${userId}`)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 shadow-md z-10"
        style={{ background: '#1a5c2e' }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/it/a/a8/Capitolina_Rugby_Logo.png"
            alt="URC"
            className="h-9 w-9 rounded-full bg-white p-0.5"
          />
          <div>
            <h1 className="text-white font-bold text-lg leading-none">URCRide</h1>
            <p className="text-white/60 text-xs">{pins.length} membri sulla mappa</p>
          </div>
        </div>
        <div className="flex gap-2">
          {currentUser ? (
            <>
              <Link href="/rides" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg font-medium transition-colors">
                Passaggi
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg font-medium transition-colors">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg font-medium transition-colors">
                Accedi
              </Link>
              <Link href="/auth/register" className="px-3 py-1.5 bg-[#c8a84b] hover:bg-[#b8943b] text-white text-sm rounded-lg font-semibold transition-colors">
                Registrati
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Stats bar */}
      {!loading && (
        <div className="flex-shrink-0 flex gap-4 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
          {[
            { label: 'Driver', count: pins.filter(p => p.role === 'driver').length, color: '#22c55e' },
            { label: 'Rider', count: pins.filter(p => p.role === 'rider').length, color: '#f97316' },
            { label: 'Passeggeri', count: pins.filter(p => p.role === 'passenger').length, color: '#3b82f6' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stat.color }} />
              <span className="text-xs text-gray-600">
                <span className="font-semibold text-gray-800">{stat.count}</span> {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Mappa */}
      <div className="flex-1 p-3 md:p-4">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">🏉</div>
              <p className="text-gray-500">Caricamento dati...</p>
            </div>
          </div>
        ) : (
          <MapView
            key={mapKey}
            pins={pins}
            currentUserId={currentUser?.id}
            onMessageUser={handleMessageUser}
          />
        )}
      </div>
    </div>
  )
}
