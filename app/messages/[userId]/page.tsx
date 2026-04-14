'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { UserProfile, Message } from '@/types'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { buildWhatsAppLink } from '@/lib/matching'

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadChat()
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadChat() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setCurrentUserId(user.id)

    const [{ data: otherProfile }, { data: msgs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true }),
    ])

    if (otherProfile) setOtherUser(otherProfile as UserProfile)
    if (msgs) setMessages(msgs as Message[])

    // Segna come letti
    await supabase.from('messages')
      .update({ read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id)
      .eq('read', false)

    setLoading(false)

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${user.id}-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        const msg = payload.new as Message
        if (msg.sender_id === userId) {
          setMessages(prev => [...prev, msg])
          supabase.from('messages').update({ read: true }).eq('id', msg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || sending) return
    setSending(true)

    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: userId,
      content: newMessage.trim(),
    }).select().single()

    if (!error && data) {
      setMessages(prev => [...prev, data as Message])
      setNewMessage('')
    }
    setSending(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-3">💬</div><p className="text-gray-500">Caricamento...</p></div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <Link href="/messages" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold text-white"
          style={{ background: '#1a5c2e' }}>
          {otherUser?.full_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 truncate">{otherUser?.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{otherUser?.address}</p>
        </div>
        {otherUser?.whatsapp_number && (
          <a
            href={buildWhatsAppLink(otherUser.whatsapp_number, otherUser.full_name, 'oggi', '?')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold"
            style={{ background: '#25D366' }}>
            💬 WA
          </a>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Inizia la conversazione con {otherUser?.full_name}
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId
          const showDate = idx === 0 ||
            new Date(messages[idx - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-xs text-gray-400 my-3">
                  {format(new Date(msg.created_at), 'EEEE d MMMM', { locale: it })}
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                  isMe
                    ? 'text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                }`} style={isMe ? { background: '#1a5c2e' } : {}}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                    {isMe && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage}
        className="flex-shrink-0 flex gap-3 px-4 py-3 bg-white border-t border-gray-200">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-opacity"
          style={{ background: '#1a5c2e' }}>
          ➤
        </button>
      </form>
    </div>
  )
}
