/**
 * Calcolo percorsi tramite OSRM (OpenStreetMap Routing Machine)
 * API pubblica, gratuita, senza chiave API
 */

export interface RouteResult {
  distance_km: number
  duration_min: number
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

/**
 * Calcola la distanza stradale tra due punti
 */
export async function getRouteDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    const route = data.routes[0]
    return {
      distance_km: route.distance / 1000,
      duration_min: route.duration / 60,
    }
  } catch {
    return null
  }
}

/**
 * Calcola il percorso con deviazione:
 * driver_home → passenger_home → URC vs driver_home → URC
 * Restituisce la deviazione in km e percentuale
 */
export async function calculateDetour(
  driver: { lat: number; lng: number },
  passenger: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ detour_km: number; detour_pct: number; is_on_the_way: boolean } | null> {
  const [direct, withStop] = await Promise.all([
    getRouteDistance(driver, destination),
    getRouteDistanceMulti([driver, passenger, destination]),
  ])

  if (!direct || !withStop) return null

  const detour_km = Math.max(0, withStop.distance_km - direct.distance_km)
  const detour_pct = (detour_km / direct.distance_km) * 100
  const is_on_the_way = detour_pct < 15 // meno del 15% di deviazione = "di passaggio"

  return { detour_km, detour_pct, is_on_the_way }
}

async function getRouteDistanceMulti(
  points: Array<{ lat: number; lng: number }>
): Promise<RouteResult | null> {
  try {
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';')
    const url = `${OSRM_BASE}/${coords}?overview=false`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    const route = data.routes[0]
    return {
      distance_km: route.distance / 1000,
      duration_min: route.duration / 60,
    }
  } catch {
    return null
  }
}

/**
 * Distanza in linea d'aria (Haversine) - usata come fallback veloce
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
