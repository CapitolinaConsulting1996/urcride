import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import type { UserProfile, RideOffer, RideRequest } from '@/types'
import { ROLE_LABELS } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: profile },
    { data: myOffers },
    { data: myRequests },
    { data: pendingRequests },
    { data: unreadMessages },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('ride_offers')
      .select('*, requests:ride_requests(*, passenger:profiles(*))')
      .eq('driver_id', user.id)
      .eq('status', 'active')
      .order('date', { ascending: true })
      .limit(5),
    supabase.from('ride_requests')
      .select('*, ride_offer:ride_offers(*, driver:profiles(*))')
      .eq('passenger_id', user.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('ride_requests')
      .select('*, passenger:profiles(*)')
      .eq('status', 'pending')
      .in('ride_offer_id',
        (await supabase.from('ride_offers').select('id').eq('driver_id', user.id)).data?.map(o => o.id) || []
      ),
    supabase.from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', user.id)
      .eq('read', false),
  ])

  const p = profile as UserProfile

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-24 md:pb-8 px-4 max-w-4xl mx-auto">
        {/* Benvenuto */}
        <div className="rounded-2xl p-5 mb-5 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1a5c2e, #2d7a46)' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {p?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-bold">Ciao, {p?.full_name?.split(' ')[0]}! 👋</h1>
              <p className="text-white/80 text-sm">{ROLE_LABELS[p?.role || 'passenger']}</p>
              {p?.address && <p className="text-white/60 text-xs mt-0.5">📍 {p.address}</p>}
            </div>
          </div>
        </div>

        {/* Alert: profilo incompleto */}
        {(!p?.lat || p.lat === 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Profilo incompleto</p>
              <p className="text-amber-700 text-xs mt-1">Aggiorna il tuo indirizzo per apparire sulla mappa</p>
              <Link href="/profile" className="text-amber-800 underline text-xs font-semibold mt-1 inline-block">
                Vai al profilo →
              </Link>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Passaggi offerti" value={myOffers?.length || 0} icon="🚗" color="#22c55e" />
          <StatCard label="Passaggi richiesti" value={myRequests?.length || 0} icon="🙋" color="#3b82f6" />
          <StatCard label="Richieste in arrivo" value={pendingRequests?.length || 0} icon="🔔" color="#f97316" />
          <StatCard label="Messaggi non letti" value={unreadMessages?.length || 0} icon="💬" color="#8b5cf6" />
        </div>

        {/* Link rapidi */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { href: '/map', icon: '🗺️', label: 'Vedi Mappa' },
            { href: '/rides', icon: '🚗', label: 'Passaggi' },
            { href: '/rides/new', icon: '➕', label: 'Offri Passaggio' },
            { href: '/messages', icon: '💬', label: 'Messaggi' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Richieste in arrivo (per driver/rider) */}
        {(pendingRequests?.length || 0) > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-3">🔔 Richieste in arrivo</h2>
            <div className="space-y-2">
              {pendingRequests?.map((req: RideRequest & { passenger?: UserProfile }) => (
                <div key={req.id} className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{req.passenger?.full_name}</p>
                      <p className="text-xs text-gray-500">{req.message || 'Nessun messaggio'}</p>
                    </div>
                    <Link href="/rides" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                      style={{ background: '#1a5c2e' }}>
                      Gestisci
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Miei passaggi offerti */}
        {(myOffers?.length || 0) > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-3">🚗 I miei passaggi</h2>
            <div className="space-y-2">
              {(myOffers as RideOffer[]).map(offer => (
                <div key={offer.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {format(new Date(offer.date), 'EEEE d MMMM', { locale: it })}
                        {' · '}{offer.time_departure}
                      </p>
                      <p className="text-xs text-gray-500">
                        {offer.seats_available}/{offer.seats_total} posti ·{' '}
                        {offer.price_per_seat > 0 ? `€${offer.price_per_seat}/persona` : 'Gratuito'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      offer.status === 'active' ? 'bg-green-100 text-green-700' :
                      offer.status === 'full' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {offer.status === 'active' ? 'Attivo' : offer.status === 'full' ? 'Completo' : 'Cancellato'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Miei passaggi richiesti */}
        {(myRequests?.length || 0) > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-3">🙋 Passaggi richiesti</h2>
            <div className="space-y-2">
              {(myRequests as Array<RideRequest & { ride_offer?: RideOffer & { driver?: UserProfile } }>).map(req => (
                <div key={req.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {req.ride_offer?.driver?.full_name || 'Driver'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {req.ride_offer?.date && format(new Date(req.ride_offer.date), 'EEEE d MMMM', { locale: it })}
                        {req.ride_offer?.time_departure && ` · ${req.ride_offer.time_departure}`}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {req.status === 'accepted' ? '✓ Accettato' :
                       req.status === 'pending' ? '⏳ In attesa' : '✗ Rifiutato'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
