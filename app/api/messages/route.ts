import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const url = new URL(request.url)
  const withUserId = url.searchParams.get('with')

  if (withUserId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${withUserId}),` +
        `and(sender_id.eq.${withUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  // Lista conversazioni (ultimo messaggio per utente)
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { receiver_id, content } = await request.json()
  if (!receiver_id || !content?.trim()) {
    return Response.json({ error: 'Campi mancanti' }, { status: 400 })
  }

  const { data, error } = await supabase.from('messages').insert({
    sender_id: user.id,
    receiver_id,
    content: content.trim(),
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
