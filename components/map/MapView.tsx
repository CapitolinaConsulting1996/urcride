'use client'

import { useEffect, useRef, useState } from 'react'
import type { MapPin } from '@/types'
import { URC_LOCATION, ROLE_LABELS } from '@/types'
import { buildWhatsAppLink } from '@/lib/matching'

interface MapViewProps {
  pins: MapPin[]
  currentUserId?: string
  onMessageUser?: (userId: string) => void
  showRoutes?: boolean
}

const PIN_COLORS: Record<string, string> = {
  passenger: '#3b82f6',
  driver:    '#22c55e',
  rider:     '#f97316',
  both:      '#22c55e',
  urc:       '#dc2626',
}

const ROUTE_COLORS: Record<string, string> = {
  driver: '#22c55e',
  rider:  '#f97316',
  both:   '#22c55e',
}

async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<[number, number][] | null> {
  try {
    const res = await fetch(
      `/api/osrm?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.coords) return null
    return data.coords as [number, number][]
  } catch {
    return null
  }
}

export default function MapView({ pins, currentUserId, onMessageUser, showRoutes = true }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading-routes' | 'drawing' | 'ready'>('loading-routes')

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const driverPins = pins.filter(p =>
      p.role !== 'passenger' &&
      p.user.lat && p.user.lng &&
      p.user.lat !== 0 && p.user.lng !== 0
    )

    async function init() {
      // ── 1. Fetch tutte le rotte in parallelo ────────────────
      type RouteResult = { pin: MapPin; coords: [number, number][] | null }
      let routeResults: RouteResult[] = []

      if (showRoutes && driverPins.length > 0) {
        setStatus('loading-routes')
        const results = await Promise.allSettled(
          driverPins.map(pin =>
            fetchRoute(pin.user.lat, pin.user.lng, URC_LOCATION.lat, URC_LOCATION.lng)
              .then(coords => ({ pin, coords }))
          )
        )
        routeResults = results
          .filter((r): r is PromiseFulfilledResult<RouteResult> => r.status === 'fulfilled')
          .map(r => r.value)
      }

      setStatus('drawing')

      // ── 2. Inizializza la mappa ─────────────────────────────
      if (!mapRef.current) return
      const L = await import('leaflet')
      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [URC_LOCATION.lat, URC_LOCATION.lng],
        zoom: 12,
        zoomControl: true,
        preferCanvas: true,
      })

      // Force recalculate container size after mount
      await new Promise(r => setTimeout(r, 50))
      map.invalidateSize()

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // ── 3. Disegna i tragitti ───────────────────────────────
      for (const { pin, coords } of routeResults) {
        const color = ROUTE_COLORS[pin.role] || '#22c55e'
        const isMe = pin.user.id === currentUserId

        // Usa OSRM se disponibile, altrimenti linea retta
        const line: [number, number][] = coords ?? [
          [pin.user.lat, pin.user.lng],
          [URC_LOCATION.lat, URC_LOCATION.lng],
        ]

        // Bordo bianco per contrasto
        L.polyline(line, {
          color: 'white',
          weight: isMe ? 8 : 6,
          opacity: 0.75,
        }).addTo(map)

        // Linea colorata
        L.polyline(line, {
          color,
          weight: isMe ? 5 : 3.5,
          opacity: isMe ? 0.95 : 0.7,
          dashArray: coords ? (isMe ? undefined : '10, 6') : '6, 8',
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;padding:2px">
              <b>${pin.user.full_name}</b><br>
              <span style="color:${color};font-size:12px">Tragitto verso il campo</span><br>
              <small style="color:#888">Da: ${pin.user.address || pin.user.zone || 'Casa'}</small>
              ${!coords ? '<br><small style="color:#f97316">⚠ percorso stimato</small>' : ''}
            </div>`)
      }

      // ── 4. Pin campo URC ────────────────────────────────────
      const urcIcon = L.divIcon({
        html: `<div style="background:${PIN_COLORS.urc};border:3px solid white;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          width:32px;height:32px;box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:16px">🏉</span></div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
      })
      L.marker([URC_LOCATION.lat, URC_LOCATION.lng], { icon: urcIcon })
        .addTo(map)
        .bindPopup(`<b style="color:#dc2626">🏉 Campo URC</b><br><small>${URC_LOCATION.address}</small>`)

      // ── 5. Pin utenti ───────────────────────────────────────
      pins.forEach(pin => {
        if (!pin.user.lat || !pin.user.lng || pin.user.lat === 0) return

        const color = PIN_COLORS[pin.role] || '#6b7280'
        const isMe = pin.user.id === currentUserId

        const icon = L.divIcon({
          html: `<div style="background:${color};border:3px solid ${isMe ? '#fbbf24' : 'white'};
            border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            width:${isMe ? 36 : 28}px;height:${isMe ? 36 : 28}px;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
          className: '',
          iconSize: [isMe ? 36 : 28, isMe ? 36 : 28],
          iconAnchor: [isMe ? 18 : 14, isMe ? 36 : 28],
          popupAnchor: [0, isMe ? -36 : -28],
        })

        const schedHtml = pin.schedules.length > 0
          ? pin.schedules.map(s =>
              `<div style="font-size:11px;color:#555">${DAY_SHORT[s.day_of_week] || s.day_of_week} ${s.time_start}–${s.time_end} ${s.type === 'arrival' ? '→ campo' : '← casa'}</div>`
            ).join('')
          : '<div style="font-size:11px;color:#999">Nessun orario</div>'

        const riderHtml = pin.rider_profile
          ? `<div style="margin-top:6px;padding:6px;background:#fff7ed;border-radius:6px;font-size:11px">
              🚗 ${[pin.rider_profile.vehicle_make, pin.rider_profile.vehicle_model, pin.rider_profile.vehicle_color ? `(${pin.rider_profile.vehicle_color})` : ''].filter(Boolean).join(' ')}<br>
              💺 ${pin.rider_profile.seats_total} posti · 💶 ${pin.rider_profile.price_per_seat > 0 ? `€${pin.rider_profile.price_per_seat}/persona` : 'Gratuito'}
            </div>` : ''

        const waBtn = pin.user.whatsapp_number && !isMe
          ? `<a href="${buildWhatsAppLink(pin.user.whatsapp_number, pin.user.full_name, 'oggi', '?')}"
               target="_blank" style="display:inline-block;margin-top:8px;padding:5px 12px;
               background:#25D366;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">
               💬 WhatsApp</a>` : ''

        const msgBtn = !isMe && onMessageUser
          ? `<button onclick="window.__urcMsg('${pin.user.id}')"
               style="display:inline-block;margin-top:8px;margin-left:6px;padding:5px 12px;
               background:#1a5c2e;color:white;border-radius:6px;font-size:12px;font-weight:600;border:none;cursor:pointer">
               ✉️ Messaggi</button>` : ''

        L.marker([pin.user.lat, pin.user.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:200px;max-width:260px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div style="width:36px;height:36px;border-radius:50%;background:${color};
                  display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0">
                  ${pin.user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;font-size:14px">${pin.user.full_name}</div>
                  <div style="font-size:11px;color:${color};font-weight:600">${ROLE_LABELS[pin.role] || pin.role}</div>
                </div>
              </div>
              <div style="font-size:12px;color:#666">📍 ${pin.user.address}</div>
              <div style="border-top:1px solid #eee;padding:6px 0 0">
                <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:2px">Orari:</div>
                ${schedHtml}
              </div>
              ${riderHtml}
              <div>${waBtn}${msgBtn}</div>
            </div>`, { maxWidth: 280 })
      })

      if (onMessageUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__urcMsg = onMessageUser
      }

      mapInstanceRef.current = map
      setStatus('ready')
    }

    init()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {status !== 'ready' && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-gray-100 rounded-xl">
          <div className="text-center">
            <div className="text-4xl mb-2 animate-pulse">🗺️</div>
            <p className="text-sm font-medium text-gray-600">
              {status === 'loading-routes' ? 'Calcolo percorsi…' : 'Disegno mappa…'}
            </p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Legenda */}
      {status === 'ready' && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 z-[400]">
          <div className="text-xs font-bold text-gray-700 mb-2">Legenda</div>
          {[
            { color: PIN_COLORS.urc,      label: 'Campo URC',           dot: true },
            { color: PIN_COLORS.driver,   label: 'Driver / gratuito',    dot: true },
            { color: PIN_COLORS.rider,    label: 'Rider / a pagamento',  dot: true },
            { color: PIN_COLORS.passenger,label: 'Passeggero',           dot: true },
            { color: ROUTE_COLORS.driver, label: 'Percorso driver',      dot: false },
            { color: ROUTE_COLORS.rider,  label: 'Percorso rider',       dot: false },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 mb-1">
              {item.dot
                ? <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                : <div className="w-6 h-1 flex-shrink-0 rounded" style={{ background: item.color }} />
              }
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DAY_SHORT: Record<string, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Gio',
  friday: 'Ven', saturday: 'Sab', sunday: 'Dom',
}
