import { createClient } from '@supabase/supabase-js'

// One-time seed endpoint — creates test accounts + data
// Call once: GET /api/seed-test
// Idempotent: safe to call multiple times (uses upsert / check before insert)

const TEST_PASSWORD = 'Test1234!'

const USERS = [
  {
    email: 'marco@test.it',
    full_name: 'Marco Rossi',
    phone: '+39 333 1111111',
    address: 'Via Candia 45, Prati, Roma',
    lat: 41.9064,
    lng: 12.4661,
    zone: 'Prati',
    role: 'rider',
    role_in_club: 'player',
    bio: 'Prima Squadra. Ho una Golf, parto quasi sempre da Prati.',
    is_admin: false,
    rating_avg: 4.8,
    trips_completed: 23,
    whatsapp_number: '+39 333 1111111',
  },
  {
    email: 'sofia@test.it',
    full_name: 'Sofia Bianchi',
    phone: '+39 333 2222222',
    address: 'Viale Europa 210, EUR, Roma',
    lat: 41.8286,
    lng: 12.4719,
    zone: 'EUR',
    role: 'passenger',
    role_in_club: 'player',
    bio: 'Squadra femminile. Vivo a EUR, cerco sempre passaggi per le partite!',
    is_admin: false,
    rating_avg: 5.0,
    trips_completed: 0,
    whatsapp_number: '+39 333 2222222',
  },
  {
    email: 'luca@test.it',
    full_name: 'Luca Verdi',
    phone: '+39 333 3333333',
    address: 'Viale Parioli 80, Parioli, Roma',
    lat: 41.9253,
    lng: 12.4982,
    zone: 'Parioli',
    role: 'both',
    role_in_club: 'player',
    bio: 'Under 18. Posso guidare e cerco anche passaggi. €4 a tratta.',
    is_admin: false,
    rating_avg: 4.5,
    trips_completed: 7,
    whatsapp_number: '+39 333 3333333',
  },
  {
    email: 'admin@test.it',
    full_name: 'Admin URC',
    phone: '+39 333 9999999',
    address: 'Via Flaminia 867, Roma',
    lat: 41.9524,
    lng: 12.4816,
    zone: 'Flaminio',
    role: 'both',
    role_in_club: 'staff',
    bio: 'Staff Unione Rugby Capitolina.',
    is_admin: true,
    rating_avg: 0,
    trips_completed: 0,
    whatsapp_number: '+39 333 9999999',
  },
]

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: Record<string, string> = {}
  const userIds: Record<string, string> = {}

  // 1. Crea utenti auth
  for (const u of USERS) {
    // Check if user exists
    const { data: existing } = await admin.auth.admin.listUsers()
    const found = existing?.users?.find(x => x.email === u.email)

    if (found) {
      userIds[u.email] = found.id
      // Reset password in case it was different
      await admin.auth.admin.updateUserById(found.id, {
        password: TEST_PASSWORD,
        email_confirm: true,
      })
      results[u.email] = 'password aggiornata'
      continue
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    })

    if (error) {
      results[u.email] = `errore auth: ${error.message}`
      continue
    }

    userIds[u.email] = data.user.id
    results[u.email] = 'creato'
  }

  // 2. Upsert profili
  const { data: teams } = await admin.from('teams').select('id, name').order('name')
  const primaSquadra = teams?.find(t => t.name?.includes('Prima'))?.id || null
  const femminile = teams?.find(t => t.name?.toLowerCase().includes('femmin'))?.id || null
  const under18 = teams?.find(t => t.name?.includes('18'))?.id || null

  const teamMap: Record<string, string | null> = {
    'marco@test.it': primaSquadra,
    'sofia@test.it': femminile,
    'luca@test.it': under18,
    'admin@test.it': null,
  }

  for (const u of USERS) {
    const uid = userIds[u.email]
    if (!uid) continue

    await admin.from('profiles').upsert({
      id: uid,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone,
      whatsapp_number: u.whatsapp_number,
      address: u.address,
      lat: u.lat,
      lng: u.lng,
      zone: u.zone,
      role: u.role,
      role_in_club: u.role_in_club,
      bio: u.bio,
      is_admin: u.is_admin,
      is_verified: true,
      rating_avg: u.rating_avg,
      trips_completed: u.trips_completed,
      team_id: teamMap[u.email],
    })
  }

  // 3. Crea eventi di test se non esistono
  const today = new Date()
  const nextSat = new Date(today)
  nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7))
  const nextSun = new Date(nextSat)
  nextSun.setDate(nextSat.getDate() + 1)
  const inTwoWeeks = new Date(today)
  inTwoWeeks.setDate(today.getDate() + 14)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const { data: existingEvents } = await admin.from('events').select('id').limit(1)
  if (!existingEvents || existingEvents.length === 0) {
    await admin.from('events').insert([
      {
        title: 'Allenamento Prima Squadra',
        event_type: 'training',
        date: fmt(nextSat),
        time_start: '10:00',
        time_end: '12:00',
        location: 'Via Flaminia 867, Roma',
        team_id: primaSquadra,
      },
      {
        title: 'Partita di campionato',
        event_type: 'match',
        date: fmt(nextSun),
        time_start: '15:30',
        time_end: '17:30',
        location: 'Via Flaminia 867, Roma',
        description: 'Prima giornata di campionato. Tutti al campo!',
        team_id: primaSquadra,
      },
      {
        title: 'Allenamento Femminile',
        event_type: 'training',
        date: fmt(nextSat),
        time_start: '14:00',
        time_end: '16:00',
        location: 'Via Flaminia 867, Roma',
        team_id: femminile,
      },
      {
        title: 'Torneo Under 18',
        event_type: 'match',
        date: fmt(inTwoWeeks),
        time_start: '09:00',
        time_end: '18:00',
        location: 'Via Flaminia 867, Roma',
        description: 'Torneo regionale. Portare tutto l\'equipaggiamento.',
        team_id: under18,
      },
    ])
    results['events'] = '4 eventi creati'
  } else {
    results['events'] = 'eventi già esistenti'
  }

  // 4. Crea passaggi di test
  const marcoId = userIds['marco@test.it']
  const lucaId = userIds['luca@test.it']
  const sofiaId = userIds['sofia@test.it']

  const { data: eventsData } = await admin.from('events').select('id, title, date').order('date').limit(4)

  const { data: existingRides } = await admin
    .from('ride_offers')
    .select('id')
    .in('driver_id', [marcoId, lucaId].filter(Boolean))
    .limit(1)

  if ((!existingRides || existingRides.length === 0) && marcoId && eventsData?.length) {
    const ev1 = eventsData[0]
    const ev2 = eventsData[1] || eventsData[0]
    const ev3 = eventsData[2] || eventsData[0]

    const { data: rides } = await admin.from('ride_offers').insert([
      {
        driver_id: marcoId,
        date: ev1.date,
        time_departure: '09:15',
        seats_available: 3,
        seats_total: 3,
        price_per_seat: 0,
        direction: 'to_field',
        event_id: ev1.id,
        team_id: primaSquadra,
        origin_address: 'Via Candia 45, Prati, Roma',
        notes: 'Parto da Prati, posso passare da Flaminio o Tiburtina',
        status: 'active',
      },
      {
        driver_id: marcoId,
        date: ev2.date,
        time_departure: '15:00',
        return_time: '18:00',
        seats_available: 3,
        seats_total: 3,
        price_per_seat: 0,
        direction: 'both',
        event_id: ev2.id,
        team_id: primaSquadra,
        origin_address: 'Via Candia 45, Prati, Roma',
        notes: 'Porto e riprendo. Passo da centro se è sulla strada.',
        status: 'active',
      },
      {
        driver_id: lucaId,
        date: ev1.date,
        time_departure: '09:30',
        seats_available: 2,
        seats_total: 2,
        price_per_seat: 4,
        direction: 'to_field',
        event_id: ev1.id,
        team_id: null,
        origin_address: 'Viale Parioli 80, Parioli, Roma',
        notes: '€4 a tratta. Zona Parioli/Flaminio.',
        status: 'active',
      },
      {
        driver_id: lucaId,
        date: ev3.date,
        time_departure: '08:30',
        seats_available: 2,
        seats_total: 2,
        price_per_seat: 4,
        direction: 'both',
        event_id: ev3.id,
        team_id: under18,
        origin_address: 'Viale Parioli 80, Parioli, Roma',
        status: 'active',
      },
    ]).select('id')

    results['rides'] = '4 passaggi creati'

    // 5. Crea richieste di Sofia verso Marco
    if (sofiaId && rides && rides.length > 0) {
      await admin.from('ride_requests').insert([
        {
          ride_offer_id: rides[0].id,
          passenger_id: sofiaId,
          message: 'Ciao Marco! Posso venire con te? Sono a Trastevere, faccio il possibile per arrivare veloce',
          status: 'pending',
        },
        {
          ride_offer_id: rides[1].id,
          passenger_id: sofiaId,
          message: 'Perfetto per il ritorno! Grazie',
          status: 'accepted',
        },
      ])
      results['requests'] = '2 richieste create (1 pending, 1 accepted)'
    }
  } else {
    results['rides'] = 'passaggi già esistenti'
  }

  return Response.json({
    ok: true,
    results,
    accounts: USERS.map(u => ({
      email: u.email,
      password: TEST_PASSWORD,
      name: u.full_name,
      role: u.role,
      isAdmin: u.is_admin,
    })),
  })
}
