import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const url = new URL(request.url)
  const from = url.searchParams.get('from') || new Date().toISOString().split('T')[0]
  const driverId = url.searchParams.get('driver_id')

  let query = supabase
    .from('ride_offers')
    .select('*, driver:profiles(*), requests:ride_requests(*, passenger:profiles(*))')
    .gte('date', from)
    .order('date', { ascending: true })

  if (driverId) query = query.eq('driver_id', driverId)
  else query = query.eq('status', 'active')

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()
  const { date, time_departure, seats_total, price_per_seat, notes } = body

  if (!date || !time_departure || !seats_total) {
    return Response.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const { data, error } = await supabase.from('ride_offers').insert({
    driver_id: user.id,
    date,
    time_departure,
    seats_available: seats_total,
    seats_total,
    price_per_seat: price_per_seat || 0,
    notes: notes || null,
    status: 'active',
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
