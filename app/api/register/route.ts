import { createClient } from '@supabase/supabase-js'

// Questo endpoint usa la service_role key per bypassare RLS durante la registrazione
// così funziona anche con la conferma email abilitata su Supabase
export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key') {
    return Response.json({ error: 'Service role key non configurata' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const body = await request.json()
  const {
    userId,
    fullName,
    phone,
    whatsapp,
    address,
    lat,
    lng,
    role,
    schedules,
    riderProfile,
  } = body

  if (!userId || !fullName || !address) {
    return Response.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  // Upsert profilo (il trigger potrebbe non aver ancora creato la riga)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    email: body.email || '',
    full_name: fullName,
    phone: phone || null,
    whatsapp_number: whatsapp || phone || null,
    address,
    lat,
    lng,
    role,
  })
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 })

  // Inserisci orari
  if (schedules?.length > 0) {
    const { error: schedError } = await admin
      .from('training_schedules')
      .insert(schedules.map((s: object) => ({ ...s, user_id: userId })))
    if (schedError) return Response.json({ error: schedError.message }, { status: 500 })
  }

  // Profilo rider
  if (role === 'rider' && riderProfile) {
    const { error: riderError } = await admin.from('rider_profiles').upsert({
      user_id: userId,
      ...riderProfile,
    })
    if (riderError) return Response.json({ error: riderError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
