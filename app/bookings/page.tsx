import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

// Supabase returns joined rows as arrays
type RawBooking = {
  id: string
  status: string
  message: string | null
  created_at: string
  ride_offer: {
    id: string
    date: string
    time_departure: string
    direction: string
    price_per_seat: number
    origin_address: string
    driver: { full_name: string; whatsapp_number?: string }[]
    event: { title: string }[]
  }[]
}

const DIRECTION_LABELS: Record<string, string> = {
  to_field: '→ Al campo',
  from_field: '← A casa',
  both: '↔ A/R',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'accepted') return <span className="badge badge-green">✓ Confermato</span>
  if (status === 'pending') return <span className="badge badge-gold">⏳ In attesa</span>
  if (status === 'rejected') return <span className="badge badge-red">✗ Rifiutato</span>
  if (status === 'cancelled') return <span className="badge badge-gray">Annullato</span>
  return <span className="badge badge-gray">{status}</span>
}

function BookingRow({ b }: { b: RawBooking }) {
  const offer = b.ride_offer?.[0]
  const driver = offer?.driver?.[0]
  const event = offer?.event?.[0]

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">
            {driver?.full_name || 'Driver'}
          </p>
          {event && (
            <p className="text-xs text-[#1a5c2e] font-medium mt-0.5">
              📅 {event.title}
            </p>
          )}
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        <span>📅 {offer?.date
          ? format(new Date(offer.date), 'EEE d MMM', { locale: it })
          : '–'}</span>
        <span>⏰ {offer?.time_departure?.slice(0, 5) || '–'}</span>
        <span>{DIRECTION_LABELS[offer?.direction ?? ''] || offer?.direction}</span>
        {offer?.price_per_seat === 0
          ? <span className="text-green-600 font-medium">Gratuito</span>
          : <span>€{offer?.price_per_seat}/posto</span>}
      </div>

      {offer?.origin_address && (
        <p className="text-xs text-gray-400 mb-3 truncate">
          📍 {offer.origin_address}
        </p>
      )}

      <div className="flex gap-2">
        <Link href={`/rides/${offer?.id}`}
          className="btn-ghost text-xs py-1.5 px-3 min-h-0 rounded-lg flex-1 text-center">
          Dettagli
        </Link>
        {b.status === 'accepted' && driver?.whatsapp_number && (
          <a
            href={`https://wa.me/${driver.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs py-1.5 px-3 min-h-0 rounded-lg flex-1 text-center"
            style={{ background: '#25d366' }}>
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

export default async function BookingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: requests } = await supabase
    .from('ride_requests')
    .select(`
      id, status, message, created_at,
      ride_offer:ride_offers(
        id, date, time_departure, direction, price_per_seat, origin_address,
        driver:profiles(full_name, whatsapp_number),
        event:events(title)
      )
    `)
    .eq('passenger_id', user.id)
    .order('created_at', { ascending: false })

  const bookings = (requests || []) as unknown as RawBooking[]

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => (b.ride_offer?.[0]?.date ?? '') >= today)
  const past = bookings.filter(b => (b.ride_offer?.[0]?.date ?? '') < today)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-2xl mx-auto">

        <h1 className="text-xl font-black text-gray-900 mb-5">Le mie prenotazioni</h1>

        {bookings.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-5xl mb-3">🎫</p>
            <p className="text-gray-500 font-medium">Nessuna prenotazione</p>
            <p className="text-gray-400 text-sm mt-1">Cerca un passaggio per i prossimi eventi</p>
            <Link href="/rides" className="btn-primary mt-4 inline-flex text-sm">
              Trova passaggio
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-6">
                <h2 className="section-title">Prossimi ({upcoming.length})</h2>
                <div className="space-y-3">
                  {upcoming.map(b => <BookingRow key={b.id} b={b} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section className="mb-6">
                <h2 className="section-title text-gray-400">Passati ({past.length})</h2>
                <div className="space-y-3 opacity-70">
                  {past.slice(0, 10).map(b => <BookingRow key={b.id} b={b} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
