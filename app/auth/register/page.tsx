'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { geocodeAddress } from '@/lib/geocoding'
import type { UserRole, DayOfWeek } from '@/types'
import { DAY_LABELS } from '@/types'

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

interface ScheduleEntry {
  day_of_week: string
  time_start: string
  time_end: string
  type: 'arrival' | 'departure'
}

// Le 3 opzioni selezionabili indipendentemente
const ROLE_OPTIONS = [
  {
    id: 'needs_ride',
    icon: '🙋',
    title: 'Cerco passaggi',
    desc: 'Vuoi che qualcuno ti porti al campo o a casa',
  },
  {
    id: 'offers_free',
    icon: '🚗',
    title: 'Offro passaggi gratis',
    desc: 'Puoi portare altri membri senza chiedere nulla',
  },
  {
    id: 'offers_paid',
    icon: '💶',
    title: 'Offro passaggi a pagamento (Rider)',
    desc: 'Vuoi un rimborso spese per ogni passeggero',
  },
]

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Step 1
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2 – ruoli (checkbox multiple)
  const [address, setAddress] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(['needs_ride']))

  function toggleRole(id: string) {
    setSelectedRoles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Deriva il role DB dalle selezioni
  function deriveDbRole(): UserRole {
    if (selectedRoles.has('offers_paid')) return 'rider'
    if (selectedRoles.has('offers_free')) return 'driver'
    return 'passenger'
  }

  // Step 3 – orari
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [newSchedule, setNewSchedule] = useState<ScheduleEntry>({
    day_of_week: 'monday', time_start: '18:00', time_end: '20:00', type: 'arrival',
  })

  // Step 4 – rider
  const [pricePerSeat, setPricePerSeat] = useState(5)
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [seatsTotal, setSeatsTotal] = useState(3)

  const router = useRouter()
  const supabase = createClient()

  const isRider = selectedRoles.has('offers_paid')
  const totalSteps = isRider ? 4 : 3

  function addSchedule() {
    setSchedules(prev => [...prev, { ...newSchedule }])
  }

  function removeSchedule(idx: number) {
    setSchedules(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    try {
      const geo = await geocodeAddress(address)
      if (!geo) {
        setError('Indirizzo non trovato. Prova: "Via Roma 10, Prati, Roma"')
        setLoading(false)
        return
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (authError) throw authError
      if (!data.user) throw new Error('Registrazione fallita')

      const dbRole = deriveDbRole()
      const userId = data.user.id

      // Usa l'API route server-side per salvare il profilo (bypassa RLS)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          fullName,
          phone: phone || null,
          whatsapp: phone || null,
          address,
          lat: geo.lat,
          lng: geo.lng,
          role: dbRole,
          schedules,
          riderProfile: isRider ? {
            price_per_seat: pricePerSeat,
            vehicle_make: vehicleMake || null,
            vehicle_model: vehicleModel || null,
            vehicle_color: vehicleColor || null,
            seats_total: seatsTotal,
            is_available: true,
          } : null,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Errore salvataggio profilo')

      // Se non c'è sessione → conferma email necessaria
      if (!data.session) {
        setEmailSent(true)
        return
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  // Schermata "controlla email"
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #0f3d1e 0%, #1a5c2e 100%)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Controlla la tua email</h2>
          <p className="text-gray-500 text-sm mb-4">
            Ti abbiamo inviato un link di conferma a <strong>{email}</strong>.
            Clicca il link per attivare il tuo account.
          </p>
          <Link href="/auth/login" className="block py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: '#1a5c2e' }}>
            Vai al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0f3d1e 0%, #1a5c2e 60%, #2d7a46 100%)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://upload.wikimedia.org/wikipedia/it/a/a8/Capitolina_Rugby_Logo.png"
            alt="URC" className="h-12 w-12 rounded-full bg-white p-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-white">URCRide</h1>
            <p className="text-white/70 text-xs">Registrazione · Step {step}/{totalSteps}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
              i + 1 <= step ? 'bg-[#c8a84b]' : 'bg-white/30'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">

          {/* ── STEP 1: Dati personali ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Dati personali</h2>
              <Field label="Nome completo">
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className={inp} placeholder="Mario Rossi" />
              </Field>
              <Field label="Email">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className={inp} placeholder="mario@email.com" />
              </Field>
              <Field label="Password (min. 8 caratteri)">
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className={inp} placeholder="••••••••" />
              </Field>
              <Field label="Telefono / WhatsApp">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className={inp} placeholder="+39 333 123 4567" />
                <p className="text-xs text-gray-400 mt-1">Usato per i link WhatsApp diretti con altri membri</p>
              </Field>
              <button onClick={() => setStep(2)} disabled={!fullName || !email || password.length < 8}
                className={btn}>Avanti →</button>
            </div>
          )}

          {/* ── STEP 2: Indirizzo + ruoli ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Dove abiti e cosa vuoi fare?</h2>
              <Field label="Indirizzo di casa">
                <input type="text" required value={address} onChange={e => setAddress(e.target.value)}
                  className={inp} placeholder="Via Salaria 100, Roma" />
                <p className="text-xs text-gray-400 mt-1">Inserisci l&apos;indirizzo completo — ti posizioneremo sulla mappa</p>
              </Field>

              <Field label="Seleziona le opzioni che ti descrivono (anche più di una)">
                <div className="space-y-2">
                  {ROLE_OPTIONS.map(opt => {
                    const active = selectedRoles.has(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleRole(opt.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          active
                            ? 'border-[#1a5c2e] bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ${
                          active ? 'bg-[#1a5c2e] border-[#1a5c2e]' : 'border-gray-300'
                        }`}>
                          {active && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            {opt.icon} {opt.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {selectedRoles.size === 0 && (
                  <p className="text-xs text-red-500 mt-1">Seleziona almeno un&apos;opzione</p>
                )}
              </Field>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className={btnSec}>← Indietro</button>
                <button onClick={() => setStep(3)}
                  disabled={!address || selectedRoles.size === 0}
                  className={btn}>Avanti →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Orari allenamenti ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Orari allenamenti</h2>
              <p className="text-sm text-gray-500">Aggiungi i tuoi orari settimanali — l&apos;app li usa per i suggerimenti passaggi</p>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Giorno">
                    <select value={newSchedule.day_of_week}
                      onChange={e => setNewSchedule(p => ({ ...p, day_of_week: e.target.value }))}
                      className={inp}>
                      {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                    </select>
                  </Field>
                  <Field label="Direzione">
                    <select value={newSchedule.type}
                      onChange={e => setNewSchedule(p => ({ ...p, type: e.target.value as 'arrival' | 'departure' }))}
                      className={inp}>
                      <option value="arrival">→ Vado al campo</option>
                      <option value="departure">← Torno a casa</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ora partenza">
                    <input type="time" value={newSchedule.time_start}
                      onChange={e => setNewSchedule(p => ({ ...p, time_start: e.target.value }))}
                      className={inp} />
                  </Field>
                  <Field label="Ora arrivo">
                    <input type="time" value={newSchedule.time_end}
                      onChange={e => setNewSchedule(p => ({ ...p, time_end: e.target.value }))}
                      className={inp} />
                  </Field>
                </div>
                <button onClick={addSchedule}
                  className="w-full py-2 text-sm font-medium rounded-lg border-2 border-dashed border-[#1a5c2e] text-[#1a5c2e] hover:bg-green-50 transition-colors">
                  + Aggiungi orario
                </button>
              </div>

              {schedules.length > 0 && (
                <div className="space-y-2">
                  {schedules.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-[#1a5c2e]">
                        {DAY_LABELS[s.day_of_week as DayOfWeek]} · {s.time_start}–{s.time_end}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{s.type === 'arrival' ? '→ Campo' : '← Casa'}</span>
                        <button onClick={() => removeSchedule(i)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <ErrorBox msg={error} />}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className={btnSec}>← Indietro</button>
                {isRider
                  ? <button onClick={() => setStep(4)} className={btn}>Avanti →</button>
                  : <button onClick={handleSubmit} disabled={loading} className={btn}>
                      {loading ? 'Registrazione...' : '✓ Completa registrazione'}
                    </button>
                }
              </div>
            </div>
          )}

          {/* ── STEP 4: Profilo Rider ── */}
          {step === 4 && isRider && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Profilo Rider 💶</h2>
              <p className="text-sm text-gray-500">Configura il tuo servizio di trasporto</p>

              <Field label={`Tariffa per passeggero: ${pricePerSeat === 0 ? '🆓 Gratuito' : `€${pricePerSeat}`}`}>
                <input type="range" min={0} max={20} step={0.5} value={pricePerSeat}
                  onChange={e => setPricePerSeat(parseFloat(e.target.value))}
                  className="w-full accent-[#1a5c2e]" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Gratis</span><span>€5</span><span>€10</span><span>€15</span><span>€20</span>
                </div>
              </Field>

              <Field label={`Posti disponibili: ${seatsTotal}`}>
                <input type="range" min={1} max={7} value={seatsTotal}
                  onChange={e => setSeatsTotal(parseInt(e.target.value))}
                  className="w-full accent-[#1a5c2e]" />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Marca">
                  <input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)}
                    className={inp} placeholder="Fiat" />
                </Field>
                <Field label="Modello">
                  <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)}
                    className={inp} placeholder="Panda" />
                </Field>
                <Field label="Colore">
                  <input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)}
                    className={inp} placeholder="Bianco" />
                </Field>
              </div>

              {error && <ErrorBox msg={error} />}
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className={btnSec}>← Indietro</button>
                <button onClick={handleSubmit} disabled={loading} className={btn}>
                  {loading ? 'Registrazione...' : '✓ Completa registrazione'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Hai già un account?{' '}
            <Link href="/auth/login" className="font-semibold text-[#1a5c2e]">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{msg}</div>
  )
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e]"
const btn = "flex-1 py-2.5 rounded-xl text-white font-semibold text-sm bg-[#1a5c2e] hover:bg-[#2d7a46] transition-colors disabled:opacity-60"
const btnSec = "px-4 py-2.5 rounded-xl text-gray-600 font-semibold text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
