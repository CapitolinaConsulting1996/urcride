'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import type { UserProfile, Message } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface ConversationPreview {
  user: UserProfile
  lastMessage: Message
  unreadCount: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setCurrentUserId(user.id)

    const { data: messages } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!messages) { setLoading(false); return }

    // Raggruppa per conversazione
    const convMap = new Map<string, ConversationPreview>()
    for (const msg of messages) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender
      if (!otherUser) continue

      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          user: otherUser as UserProfile,
          lastMessage: msg as Message,
          unreadCount: 0,
        })
      }
      if (msg.receiver_id === user.id && !msg.read) {
        const conv = convMap.get(otherId)!
        conv.unreadCount++
      }
    }

    setConversations(Array.from(convMap.values()))
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-3">💬</div><p className="text-gray-500">Caricamento...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-24 md:pb-8 px-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-5">Messaggi</h1>

        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-gray-500 text-sm">Nessun messaggio ancora</p>
            <p className="text-gray-400 text-xs mt-1">Clicca su un pin nella mappa per contattare un membro</p>
            <Link href="/map" className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold inline-block"
              style={{ background: '#1a5c2e' }}>
              Vai alla mappa
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map(conv => (
              <Link key={conv.user.id} href={`/messages/${conv.user.id}`}
                className="flex items-center gap-3 bg-white rounded-xl p-4 hover:bg-gray-50 transition-colors border border-gray-100">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style={{ background: '#1a5c2e' }}>
                  {conv.user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {conv.user.full_name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(conv.lastMessage.created_at), 'dd/MM HH:mm', { locale: it })}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                    {conv.lastMessage.sender_id === currentUserId ? 'Tu: ' : ''}
                    {conv.lastMessage.content}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0"
                    style={{ background: '#1a5c2e' }}>
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
