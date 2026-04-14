/**
 * Geocoding tramite Nominatim (OpenStreetMap) - gratuito, no API key
 */

export interface GeocodingResult {
  lat: number
  lng: number
  display_name: string
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const query = encodeURIComponent(`${address}, Roma, Italia`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=it`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'URCRide/1.0 (unione rugby capitolina carpooling app)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    }
  } catch {
    return null
  }
}
