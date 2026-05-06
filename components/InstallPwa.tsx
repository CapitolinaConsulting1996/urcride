'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPwa() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Non mostrare se già installata come standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as { standalone?: boolean }).standalone) return
    if (sessionStorage.getItem('pwa-banner-dismissed')) return

    setDismissed(false)

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setDismissed(true)
    else dismiss()
  }

  // Mostra solo su mobile e solo se non già installata
  if (dismissed) return null
  if (typeof window !== 'undefined' && window.innerWidth >= 768) return null

  return (
    <div className="fixed bottom-[72px] left-3 right-3 z-40 rounded-2xl shadow-xl overflow-hidden"
      style={{ background: '#1a5c2e' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/apple-touch-icon.png" alt="URCRide" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">Installa URCRide</p>
          {isIos ? (
            <p className="text-white/70 text-xs mt-0.5">
              Tocca <span className="font-semibold">Condividi</span> → "Aggiungi a schermata Home"
            </p>
          ) : (
            <p className="text-white/70 text-xs mt-0.5">Accesso rapido dalla schermata Home</p>
          )}
        </div>
        {!isIos && prompt && (
          <button onClick={install}
            className="flex-shrink-0 bg-white text-[#1a5c2e] font-bold text-xs px-3 py-1.5 rounded-lg">
            Installa
          </button>
        )}
        <button onClick={dismiss}
          className="flex-shrink-0 text-white/60 hover:text-white text-lg leading-none ml-1">
          ✕
        </button>
      </div>
    </div>
  )
}
