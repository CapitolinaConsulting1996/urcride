'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { geocodeAddress } from '@/lib/geocoding'
import type { UserProfile, TrainingSchedule, RiderProfile, UserRole, DayOfWeek } from '@/types'
import { ROLE_LABELS, DAY_LABELS } from '@/types'

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([])
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [role, setRole] = useState<UserRole>('passenger')
  const [bio, setBio] = useState('')

  // Orari
  const [newDay, setNewDay] = useState<DayOfWeek>('monday')
  const [newTimeStart, setNewTimeStart] = useState('18:00')
  const [newTimeEnd, setNewTimeEnd] = useState('20:00')
  const [newType, setNewType] = useState<'arrival' | 'departure'>('arrival')

  // Rider
  const [pricePerSeat, setPricePerSeat] = useState(5)
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [seatsTotal, setSeatsTotal] = useState(3)
  const [isAvailable, setIsAvailable] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('training_schedules').select('*').eq('user_id', user.id),
      supabase.from('rider_profiles').select('*').eq('user_id', user.id).single(),
    ])

    if (p) {
      const prof = p as UserProfile
      setProfile(prof)
      setFullName(prof.full_name || '')
      setPhone(prof.phone || '')
      setWhatsapp(prof.whatsapp_number || '')
      setAddress(prof.address || '')
      setRole(prof.role || 'passenger')
      setBio(prof.bio || '')
    }
    if (s) setSchedules(s as TrainingSchedule[])
    if (r) {
      const rp = r as RiderProfile
      setRiderProfile(rp)
      setPricePerSeat(rp.price_per_seat || 5)
      setVehicleMake(rp.vehicle_make || '')
      setVehicleModel(rp.vehicle_model || '')
      setVehicleColor(rp.vehicle_color || '')
      setSeatsTotal(rp.seats_total || 3)
      setIsAvailable(rp.is_available ?? true)
    }
    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    setMessage('')

    let lat = profile.lat
    let lng = profile.lng
    if (address !== profile.address) {
      const geo = await geocodeAddress(address)
      if (geo) { lat = geo.lat; lng = geo.lng }
    }

    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      phone: phone || null,
      whatsapp_number: whatsapp || phone || null,
      address,
      lat,
      lng,
      role,
      bio: bio || null,
    }).eq('id', profile.id)

    if (!error) {
      // Aggiorna profilo rider se necessario
      if (role === 'rider') {
        const riderData = {
          user_id: profile.id,
          price_per_seat: pricePerSeat,
          vehicle_make: vehicleMake || null,
          vehicle_model: vehicleModel || null,
          vehicle_color: vehicleColor || null,
          seats_total: seatsTotal,
          is_available: isAvailable,
        }
        if (riderProfile) {
          await supabase.from('rider_profiles').update(riderData).eq('user_id', profile.id)
        } else {
          await supabase.from('rider_profiles').insert(riderData)
        }
      }
      setMessage('Profilo aggiornato con successo! ✓')
      loadProfile()
    } else {
      setMessage('Errore durante il salvataggio')
    }
    setSaving(false)
  }

  async function addSchedule() {
    if (!profile) return
    const { error } = await supabase.from('training_schedules').insert({
      user_id: profile.id,
      day_of_week: newDay,
      time_start: newTimeStart,
      time_end: newTimeEnd,
      type: newType,
    })
    if (!error) loadProfile()
  }

  async function deleteSchedule(id: string) {
    await supabase.from('training_schedules').delete().eq('id', id)
    loadProfile()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-3">👤</div><p className="text-gray-500">Caricamento...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-24 md:pb-8 px-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-5">Il mio profilo</h1>

        {/* Avatar */}
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
            style={{ background: '#1a5c2e' }}>
            {fullName.charAt(0).toUpperCase() || '?'}
          </div>
        </div>

        {/* Dati personali */}
        <Section title="Dati personali">
          <Field label="Nome completo">
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={input} />
          </Field>
          <Field label="Telefono">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={input} placeholder="+39 333..." />
          </Field>
          <Field label="WhatsApp">
            <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={input} placeholder="+39 333..." />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={e => setBio(e.target.value)} className={`${input} h-16 resize-none`}
              placeholder="Presentati alla community..." />
          </Field>
        </Section>

        {/* Indirizzo */}
        <Section title="Indirizzo di casa">
          <Field label="Indirizzo">
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={input}
              placeholder="Via Roma 10, Prati, Roma" />
          </Field>
          <Field label="Ruolo nella community">
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                <label key={v} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  role === v ? 'border-[#1a5c2e] bg-green-50' : 'border-gray-200'}`}>
                  <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} />
                  <span className="text-sm font-medium text-gray-700">{l}</span>
                </label>
              ))}
            </div>
          </Field>
        </Section>

        {/* Profilo Rider */}
        {role === 'rider' && (
          <Section title="Profilo Rider">
            <Field label={`Tariffa per passeggero: ${pricePerSeat === 0 ? 'Gratuito' : `€${pricePerSeat}`}`}>
              <input type="range" min={0} max={20} step={0.5} value={pricePerSeat}
                onChange={e => setPricePerSeat(parseFloat(e.target.value))} className="w-full accent-[#1a5c2e]" />
            </Field>
            <Field label={`Posti: ${seatsTotal}`}>
              <input type="range" min={1} max={7} value={seatsTotal}
                onChange={e => setSeatsTotal(parseInt(e.target.value))} className="w-full accent-[#1a5c2e]" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Marca"><input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} className={input} placeholder="Fiat" /></Field>
              <Field label="Modello"><input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className={input} placeholder="Panda" /></Field>
              <Field label="Colore"><input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} className={input} placeholder="Bianco" /></Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)}
                className="w-4 h-4 accent-[#1a5c2e]" />
              <span className="text-sm text-gray-700">Disponibile per passaggi</span>
            </label>
          </Section>
        )}

        {/* Salva profilo */}
        {message && (
          <div className={`rounded-xl px-4 py-2 text-sm mb-4 ${
            message.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>{message}</div>
        )}
        <button onClick={saveProfile} disabled={saving}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm mb-6 disabled:opacity-60"
          style={{ background: '#1a5c2e' }}>
          {saving ? 'Salvataggio...' : 'Salva profilo'}
        </button>

        {/* Orari allenamenti */}
        <Section title="Orari allenamenti">
          <div className="bg-gray-50 rounded-xl p-3 space-y-3 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Giorno">
                <select value={newDay} onChange={e => setNewDay(e.target.value as DayOfWeek)} className={input}>
                  {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </select>
              </Field>
              <Field label="Tipo">
                <select value={newType} onChange={e => setNewType(e.target.value as 'arrival' | 'departure')} className={input}>
                  <option value="arrival">→ Al campo</option>
                  <option value="departure">← A casa</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Inizio"><input type="time" value={newTimeStart} onChange={e => setNewTimeStart(e.target.value)} className={input} /></Field>
              <Field label="Fine"><input type="time" value={newTimeEnd} onChange={e => setNewTimeEnd(e.target.value)} className={input} /></Field>
            </div>
            <button onClick={addSchedule} className="w-full py-2 text-sm font-medium rounded-lg border-2 border-dashed border-[#1a5c2e] text-[#1a5c2e] hover:bg-green-50 transition-colors">
              + Aggiungi orario
            </button>
          </div>

          {schedules.length > 0 ? (
            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-[#1a5c2e]">
                    {DAY_LABELS[s.day_of_week as DayOfWeek]} · {s.time_start}–{s.time_end}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{s.type === 'arrival' ? '→ Campo' : '← Casa'}</span>
                    <button onClick={() => deleteSchedule(s.id)} className="text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">Nessun orario aggiunto</p>
          )}
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h2 className="text-base font-bold text-gray-800 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c2e] focus:border-transparent"
