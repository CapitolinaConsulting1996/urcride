'use client'

import { useEffect, useRef } from 'react'
import type { MapPin } from '@/types'
import { URC_LOCATION, ROLE_LABELS } from '@/types'
import { buildWhatsAppLink } from '@/lib/matching'

interface MapViewProps {
  pins: MapPin[]
  currentUserId?: string
  onMessageUser?: (userId: string) => void
}

// Colori per ruolo
const PIN_COLORS: Record<string, string> = {
  passenger: '#3b82f6',  // blu
  driver: '#22c55e',     // verde
  rider: '#f97316',      // arancio
  urc: '#dc2626',        // rosso (campo)
}

export default function MapView({ pins, currentUserId, onMessageUser }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Import dinamico di Leaflet (solo client-side)
    import('leaflet').then(L => {
      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [URC_LOCATION.lat, URC_LOCATION.lng],
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Pin campo URC
      const urcIcon = L.divIcon({
        html: `<div style="
          background:${PIN_COLORS.urc};
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          width:32px;height:32px;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:16px;">🏉</span>
        </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })

      L.marker([URC_LOCATION.lat, URC_LOCATION.lng], { icon: urcIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui;min-width:180px">
            <div style="font-weight:700;font-size:14px;color:#dc2626;margin-bottom:4px">🏉 Campo URC</div>
            <div style="font-size:12px;color:#555">${URC_LOCATION.address}</div>
          </div>
        `)

      // Pin utenti
      pins.forEach(pin => {
        if (!pin.user.lat || !pin.user.lng) return

        const color = PIN_COLORS[pin.role] || '#6b7280'
        const isCurrentUser = pin.user.id === currentUserId

        const icon = L.divIcon({
          html: `<div style="
            background:${color};
            border:3px solid ${isCurrentUser ? '#fbbf24' : 'white'};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            width:${isCurrentUser ? 36 : 28}px;
            height:${isCurrentUser ? 36 : 28}px;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            ${isCurrentUser ? 'animation:pin-pulse 2s ease-in-out infinite;' : ''}
          ">
          </div>`,
          className: isCurrentUser ? 'pin-pulse' : '',
          iconSize: [isCurrentUser ? 36 : 28, isCurrentUser ? 36 : 28],
          iconAnchor: [isCurrentUser ? 18 : 14, isCurrentUser ? 36 : 28],
          popupAnchor: [0, isCurrentUser ? -36 : -28],
        })

        const scheduleHtml = pin.schedules.length > 0
          ? pin.schedules.map(s => `
              <div style="font-size:11px;color:#555;margin-top:2px">
                ${DAY_SHORT[s.day_of_week] || s.day_of_week} ${s.time_start}–${s.time_end}
                ${s.type === 'arrival' ? '→ campo' : '← casa'}
              </div>`).join('')
          : '<div style="font-size:11px;color:#999;margin-top:2px">Nessun orario</div>'

        const riderHtml = pin.rider_profile
          ? `<div style="margin-top:6px;padding:6px;background:#fff7ed;border-radius:6px;font-size:11px">
              🚗 ${pin.rider_profile.vehicle_make || ''} ${pin.rider_profile.vehicle_model || ''}
              ${pin.rider_profile.vehicle_color ? `(${pin.rider_profile.vehicle_color})` : ''}<br>
              💺 ${pin.rider_profile.seats_total} posti ·
              💶 ${pin.rider_profile.price_per_seat > 0 ? `€${pin.rider_profile.price_per_seat}/persona` : 'Gratuito'}
            </div>` : ''

        const whatsappBtn = pin.user.whatsapp_number && pin.user.id !== currentUserId
          ? `<a href="${buildWhatsAppLink(pin.user.whatsapp_number, pin.user.full_name, 'oggi', '?')}"
               target="_blank"
               style="display:inline-block;margin-top:8px;padding:5px 12px;background:#25D366;color:white;
                      border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">
               💬 WhatsApp
             </a>` : ''

        const messageBtn = pin.user.id !== currentUserId && onMessageUser
          ? `<button
               onclick="window.__urcMessageUser('${pin.user.id}')"
               style="display:inline-block;margin-top:8px;margin-left:6px;padding:5px 12px;
                      background:#1a5c2e;color:white;border-radius:6px;font-size:12px;
                      font-weight:600;border:none;cursor:pointer">
               ✉️ Messaggi
             </button>` : ''

        const popupContent = `
          <div style="font-family:system-ui;min-width:200px;max-width:260px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:36px;height:36px;border-radius:50%;background:${color};
                          display:flex;align-items:center;justify-content:center;
                          color:white;font-weight:700;font-size:16px;flex-shrink:0">
                ${pin.user.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:700;font-size:14px;color:#1a1a1a">${pin.user.full_name}</div>
                <div style="font-size:11px;color:${color};font-weight:600">${ROLE_LABELS[pin.role]}</div>
              </div>
            </div>
            <div style="font-size:12px;color:#666;margin-bottom:4px">📍 ${pin.user.address}</div>
            <div style="border-top:1px solid #eee;padding-top:6px;margin-top:4px">
              <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:2px">Orari allenamenti:</div>
              ${scheduleHtml}
            </div>
            ${riderHtml}
            <div style="margin-top:4px">${whatsappBtn}${messageBtn}</div>
          </div>
        `

        L.marker([pin.user.lat, pin.user.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 280 })
      })

      // Esponi callback per messaggi dai popup
      if (onMessageUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__urcMessageUser = onMessageUser
      }

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aggiorna pin quando cambiano
  useEffect(() => {
    if (!mapInstanceRef.current) return
    // Il re-render dei pin richiederebbe la rimozione e ricreazione dei layer
    // Per semplicità, un full reload è gestito tramite key prop nel parent
  }, [pins])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 z-[400]">
        <div className="text-xs font-bold text-gray-700 mb-2">Legenda</div>
        {[
          { color: PIN_COLORS.urc, label: 'Campo URC' },
          { color: PIN_COLORS.driver, label: 'Driver (gratuito)' },
          { color: PIN_COLORS.rider, label: 'Rider (a pagamento)' },
          { color: PIN_COLORS.passenger, label: 'Passeggero' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DAY_SHORT: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mer',
  thursday: 'Gio',
  friday: 'Ven',
  saturday: 'Sab',
  sunday: 'Dom',
}
