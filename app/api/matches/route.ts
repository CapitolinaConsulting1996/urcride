import { createServerSupabaseClient } from '@/lib/supabase-server'
import { rankOffers } from '@/lib/matching'
import type { UserProfile } from '@/types'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const url = new URL(request.url)
  const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
  const targetTime = url.searchParams.get('time') || '18:00'

  const [{ data: profile }, { data: schedules }, { data: offers }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('training_schedules').select('*').eq('user_id', user.id),
    supabase
      .from('ride_offers')
      .select('*, driver:profiles(*)')
      .eq('status', 'active')
      .gte('date', targetDate)
      .neq('driver_id', user.id),
  ])

  if (!profile || !offers?.length) return Response.json([])

  const ranked = await rankOffers({
    passenger: profile as UserProfile,
    passenger_schedules: schedules || [],
    offers: offers as Array<Parameters<typeof rankOffers>[0]['offers'][0]>,
    target_date: targetDate,
    target_time: targetTime,
  })

  return Response.json(ranked.slice(0, 10))
}
