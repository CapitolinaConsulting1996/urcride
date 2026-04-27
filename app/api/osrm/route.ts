import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fromLat = searchParams.get('fromLat')
  const fromLng = searchParams.get('fromLng')
  const toLat = searchParams.get('toLat')
  const toLng = searchParams.get('toLng')

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return Response.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    )
    clearTimeout(timer)

    if (!res.ok) return Response.json({ error: 'OSRM error', status: res.status }, { status: 502 })

    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      return Response.json({ error: 'No route', code: data.code }, { status: 404 })
    }

    // Return coords as [lat, lng] pairs (Leaflet format)
    const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )

    return Response.json({ coords })
  } catch (e) {
    return Response.json({ error: 'Fetch failed', detail: String(e) }, { status: 502 })
  }
}
