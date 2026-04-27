import Link from 'next/link'
import type { ClubEvent } from '@/types'
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  event: ClubEvent
  compact?: boolean
}

const EVENT_COLORS: Record<string, string> = {
  training: '#1a5c2e',
  match:    '#dc2626',
  away:     '#7c3aed',
  social:   '#0891b2',
  meeting:  '#374151',
  other:    '#6b7280',
}

export default function EventCard({ event, compact }: Props) {
  const color = EVENT_COLORS[event.event_type] || '#6b7280'
  const icon = EVENT_TYPE_ICONS[event.event_type] || '📌'
  const label = EVENT_TYPE_LABELS[event.event_type] || 'Evento'

  if (compact) return (
    <Link href={`/events/${event.id}`}>
      <div className="card p-4 w-40 hover:shadow-md transition-shadow cursor-pointer">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2"
          style={{ background: `${color}18` }}>
          {icon}
        </div>
        <p className="text-xs font-semibold mb-0.5" style={{ color }}>{label}</p>
        <p className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{event.title}</p>
        <p className="text-xs text-gray-500">
          {format(new Date(event.date), 'EEE d MMM', { locale: it })}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{event.time_start.slice(0,5)}</p>
        {event.rides_count !== undefined && (
          <div className="mt-2 text-xs font-medium"
            style={{ color: event.rides_count > 0 ? '#15803d' : '#b91c1c' }}>
            {event.rides_count > 0 ? `🚗 ${event.rides_count} passaggi` : '⚠️ Nessun passaggio'}
          </div>
        )}
      </div>
    </Link>
  )

  return (
    <Link href={`/events/${event.id}`}>
      <div className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <div className="h-2" style={{ background: color }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${color}18`, color }}>
                  {label}
                </span>
                {event.team && (
                  <span className="badge badge-gray text-xs">{event.team.name}</span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-base">{event.title}</h3>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-2xl font-black leading-none" style={{ color }}>
                {format(new Date(event.date), 'd')}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase">
                {format(new Date(event.date), 'MMM', { locale: it })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>⏰ {event.time_start.slice(0,5)}{event.time_end ? `–${event.time_end.slice(0,5)}` : ''}</span>
            <span>📍 {event.location}</span>
          </div>

          {event.rides_count !== undefined && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className={`text-sm font-medium ${event.rides_count > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {event.rides_count > 0
                  ? `🚗 ${event.rides_count} passaggi disponibili`
                  : '⚠️ Nessun passaggio ancora'}
              </span>
              <span className="text-xs text-gray-400">Vedi →</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
