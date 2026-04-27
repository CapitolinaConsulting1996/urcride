'use client'
import Link from 'next/link'
import type { RideOffer } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  offer: RideOffer
  onRequest?: (offer: RideOffer) => void
  myRequestStatus?: string | null
  compact?: boolean
}

export default function RideCard({ offer, onRequest, myRequestStatus, compact }: Props) {
  const pct = Math.round(((offer.seats_total - offer.seats_available) / offer.seats_total) * 100)
  const isFree = offer.price_per_seat === 0

  const statusBadge = () => {
    if (offer.seats_available === 0) return <span className="badge badge-red">Completo</span>
    if (pct >= 50) return <span className="badge badge-gold">Quasi pieno</span>
    return <span className="badge badge-green">{offer.seats_available} posti</span>
  }

  const requestBtn = () => {
    if (myRequestStatus === 'accepted') return <span className="badge badge-green">✓ Confermato</span>
    if (myRequestStatus === 'pending')  return <span className="badge badge-gold">⏳ In attesa</span>
    if (myRequestStatus === 'rejected') return <span className="badge badge-red">✗ Rifiutato</span>
    if (offer.seats_available === 0) return (
      <button className="btn-ghost text-xs px-3 py-2 min-h-0">Lista attesa</button>
    )
    return (
      <button
        onClick={e => { e.preventDefault(); onRequest?.(offer) }}
        className="btn-primary text-sm px-4 py-2 min-h-0 rounded-xl"
      >
        Richiedi
      </button>
    )
  }

  if (compact) return (
    <Link href={`/rides/${offer.id}`} className="block">
      <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
              style={{ background: '#1a5c2e' }}>
              {offer.driver?.full_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{offer.driver?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">
                {offer.driver?.zone || offer.driver?.address?.split(',')[0]} · {offer.time_departure}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {statusBadge()}
            <span className={`text-xs font-semibold ${isFree ? 'text-green-600' : 'text-orange-600'}`}>
              {isFree ? '🆓 Gratis' : `💶 €${offer.price_per_seat}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <Link href={`/rides/${offer.id}`} className="block">
      <div className="card p-5 hover:shadow-md transition-all cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ background: '#1a5c2e' }}>
              {offer.driver?.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{offer.driver?.full_name}</p>
                {offer.driver?.is_verified && (
                  <span className="text-blue-500 text-sm" title="Verificato">✓</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(offer.driver?.rating_avg ?? 0) > 0 && (
                  <span className="text-xs text-gray-500">
                    ⭐ {offer.driver?.rating_avg?.toFixed(1)}
                  </span>
                )}
                {(offer.driver?.trips_completed ?? 0) > 0 && (
                  <span className="text-xs text-gray-400">
                    · {offer.driver?.trips_completed} viaggi
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {statusBadge()}
            <span className={`text-sm font-bold ${isFree ? 'text-green-600' : 'text-orange-600'}`}>
              {isFree ? '🆓 Gratuito' : `💶 €${offer.price_per_seat}/persona`}
            </span>
          </div>
        </div>

        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <div className="w-0.5 h-6 bg-gray-200 my-1" />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1a5c2e' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              {offer.driver?.zone || offer.driver?.address?.split(',')[0] || 'Partenza'}
            </p>
            <p className="text-sm font-medium mt-5" style={{ color: '#1a5c2e' }}>
              Campo URC — Via Flaminia 867
            </p>
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            📅 {format(new Date(offer.date), 'EEE d MMM', { locale: it })}
          </span>
          <span className="text-gray-300">·</span>
          <span>⏰ {offer.time_departure}</span>
          {offer.direction === 'both' && (
            <>
              <span className="text-gray-300">·</span>
              <span>↔ A/R</span>
            </>
          )}
          {offer.has_luggage && (
            <>
              <span className="text-gray-300">·</span>
              <span>🎒 Borsoni OK</span>
            </>
          )}
          {offer.event && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#f0fdf4', color: '#15803d' }}>
                🏉 {offer.event.title}
              </span>
            </>
          )}
        </div>

        {/* Seats bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{offer.seats_total - offer.seats_available} su {offer.seats_total} prenotati</span>
            <span>{offer.seats_available} disponibili</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e',
              }} />
          </div>
        </div>

        {/* Notes */}
        {offer.notes && (
          <p className="text-xs text-gray-400 italic mb-4 line-clamp-2">"{offer.notes}"</p>
        )}

        {/* Action */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Clicca per i dettagli</span>
          {onRequest && (
            <div onClick={e => e.stopPropagation()}>
              {requestBtn()}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
