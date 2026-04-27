'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { geocodeAddress } from '@/lib/geocoding'
import type { UserProfile, TrainingSchedule, RiderProfile, UserRole, DayOfWeek, Team } from '@/types'
import { ROLE_LABELS, DAY_LABELS, ROLE_IN_CLUB_LABELS } from '@/types'

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const ZONES = [
  'Prati', 'Flaminio', 'Parioli', 'Trionfale', 'Balduina',
  'EUR', 'Ostiense', 'Trastevere', 'Centro Storico', 'Testaccio',
  'Tiburtina', 'Prenestina', 'Tuscolana', 'Nomentana', 'Altro',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([])
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [zone, setZone] = useState('')
  const [role, setRole] = useState<UserRole>('passenger')
  const [roleInClub, setRoleInClub] = useState('')
  const [teamId, setTeamId] = useState('')
  const [bio, setBio] = useState('')

  const [newDay, setNewDay] = useState<DayOfWeek>('monday')
  const [newTimeStart, setNewTimeStart] = useState('18:00')
  const [newTimeEnd, setNewTimeEnd] = useState('20:00')
  const [newType, setNewType] = useState<'arrival' | 'departure'>('arrival')

  const [pricePerSeat, setPricePerSeat] = useState(5)
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [seatsTotal, setSeatsTotal] = useState(3)
  const [isAvailable, setIsAvailable] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: p }, { data: s }, { data: r }, { data: tms }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('training_schedules').select('*').eq('user_id', user.id),
      supabase.from('rider_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('teams').select('*').order('name'),
    ])

    if (p) {
      const prof = p as UserProfile
      setProfile(prof)
      setFullName(prof.full_name || '')
      setPhone(prof.phone || '')
      setWhatsapp(prof.whatsapp_number || '')
      setAddress(prof.address || '')
      setZone(prof.zone || '')
      setRole(prof.role || 'passenger')
      setRoleInClub(prof.role_in_club || '')
      setTeamId(prof.team_id || '')
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
    setTeams((tms || []) as Team[])
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
      zone: zone || null,
      lat,
      lng,
      role,
      role_in_club: roleInClub || null,
      team_id: teamId || null,
      bio: bio || null,
    }).eq('id', profile.id)

    if (!error) {
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
      setMessage('✓ Profilo aggiornato!')
      loadProfile()
    } else {
      setMessage('Errore durante il salvataggio')
    }
    setSaving(false)
  }

  async function addSchedule() {
    if (!profile) return
    await supabase.from('training_schedules').insert({
      user_id: profile.id,
      day_of_week: newDay,
      time_start: newTimeStart,
      time_end: newTimeEnd,
      type: newType,
    })
    loadProfile()
  }

  async function deleteSchedule(id: string) {
    await supabase.from('training_schedules').delete().eq('id', id)
    loadProfile()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center"><div className="text-5xl mb-3">👤</div><p className="text-gray-400">Caricamento...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="pt-4 md:pt-20 pb-safe px-4 max-w-lg mx-auto">

        {/* ── Avatar header ────────────────────────────────── */}
        <div className="rounded-2xl p-5 text-white mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f3d1e 0%, #1a5c2e 60%, #2d7a46 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black border-2 border-white/30 flex-shrink-0">
              {fullName.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-black">{fullName || 'Il mio profilo'}</h1>
              {zone && <p className="text-white/70 text-sm mt-0.5">📍 {zone}</p>}
              {profile?.is_verified && <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs mt-1">✓ Verificato</span>}
            </div>
          </div>
          {profile && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
              <div className="text-center flex-1">
                <div className="text-lg font-black">{profile.trips_completed || 0}</div>
                <div className="text-xs text-white/60">Viaggi</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-lg font-black">{(profile.rating_avg || 0) > 0 ? profile.rating_avg.toFixed(1) : '–'}</div>
                <div className="text-xs text-white/60">Rating</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-lg font-black">{profile.role === 'rider' ? '🚗' : '🏃'}</div>
                <div className="text-xs text-white/60">{ROLE_LABELS[profile.role as UserRole] || profile.role}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Dati personali ───────────────────────────────── */}
        <div className="card p-5 mb-4">
          <h2 className="section-title">Dati personali</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Telefono</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+39 333..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">WhatsApp</label>
                <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="input" placeholder="+39 333..." />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} className="input h-16 resize-none"
                placeholder="Presentati alla community..." />
            </div>
          </div>
        </div>

        {/* ── Indirizzo e zona ─────────────────────────────── */}
        <div className="card p-5 mb-4">
          <h2 className="section-title">Dove abiti</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Indirizzo di casa</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="input"
                placeholder="Via Roma 10, Prati, Roma" />
              <p className="text-xs text-gray-400 mt-1">Usato per la mappa e per calcolare i percorsi</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Zona di Roma</label>
              <select value={zone} onChange={e => setZone(e.target.value)} className="input">
                <option value="">Seleziona zona</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Club ─────────────────────────────────────────── */}
        <div className="card p-5 mb-4">
          <h2 className="section-title">Club</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Squadra / Categoria</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="input">
                <option value="">Nessuna squadra</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ruolo nel club</label>
              <select value={roleInClub} onChange={e => setRoleInClub(e.target.value)} className="input">
                <option value="">Seleziona ruolo</option>
                {Object.entries(ROLE_IN_CLUB_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Ruolo passaggi ───────────────────────────────── */}
        <div className="card p-5 mb-4">
          <h2 className="section-title">Ruolo passaggi</h2>
          <div className="space-y-2">
            {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
              <label key={v} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                role === v ? 'border-[#1a5c2e] bg-green-50' : 'border-gray-200 bg-white'
              }`}>
                <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)}
                  className="w-4 h-4 accent-[#1a5c2e]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{l}</p>
                  <p className="text-xs text-gray-500">
                    {v === 'passenger' ? 'Cerchi passaggi da altri' :
                     v === 'rider' ? 'Offri passaggi e gestisci il tuo profilo autista' :
                     'Sia passeggero che autista'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Profilo Rider ────────────────────────────────── */}
        {role === 'rider' && (
          <div className="card p-5 mb-4">
            <h2 className="section-title">Profilo Autista</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">
                  Tariffa per passeggero: <span className="font-bold text-gray-800">
                    {pricePerSeat === 0 ? 'Gratuito 🆓' : `€${pricePerSeat}`}
                  </span>
                </label>
                <input type="range" min={0} max={20} step={0.5} value={pricePerSeat}
                  onChange={e => setPricePerSeat(parseFloat(e.target.value))} className="w-full accent-[#1a5c2e]" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Gratis</span><span>€10</span><span>€20</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">
                  Posti disponibili: <span className="font-bold text-gray-800">{seatsTotal}</span>
                </label>
                <input type="range" min={1} max={7} value={seatsTotal}
                  onChange={e => setSeatsTotal(parseInt(e.target.value))} className="w-full accent-[#1a5c2e]" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Marca</label>
                  <input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} className="input" placeholder="Fiat" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Modello</label>
                  <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="input" placeholder="Panda" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Colore</label>
                  <input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} className="input" placeholder="Bianco" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 accent-[#1a5c2e]" />
                <span className="text-sm text-gray-700 font-medium">Disponibile per passaggi</span>
              </label>
            </div>
          </div>
        )}

        {/* ── Salva ────────────────────────────────────────── */}
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-4 font-medium ${
            message.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>{message}</div>
        )}
        <button onClick={saveProfile} disabled={saving} className="btn-primary w-full mb-6">
          {saving ? 'Salvataggio...' : 'Salva profilo'}
        </button>

        {/* ── Orari allenamenti ────────────────────────────── */}
        <div className="card p-5 mb-6">
          <h2 className="section-title">Orari allenamenti</h2>
          <div className="bg-gray-50 rounded-xl p-3 space-y-3 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Giorno</label>
                <select value={newDay} onChange={e => setNewDay(e.target.value as DayOfWeek)} className="input text-sm py-2 min-h-0">
                  {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                <select value={newType} onChange={e => setNewType(e.target.value as 'arrival' | 'departure')} className="input text-sm py-2 min-h-0">
                  <option value="arrival">→ Al campo</option>
                  <option value="departure">← A casa</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Inizio</label>
                <input type="time" value={newTimeStart} onChange={e => setNewTimeStart(e.target.value)} className="input text-sm py-2 min-h-0" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Fine</label>
                <input type="time" value={newTimeEnd} onChange={e => setNewTimeEnd(e.target.value)} className="input text-sm py-2 min-h-0" />
              </div>
            </div>
            <button onClick={addSchedule}
              className="w-full py-2 text-sm font-semibold rounded-xl border-2 border-dashed border-[#1a5c2e] text-[#1a5c2e] hover:bg-green-50 transition-colors">
              + Aggiungi orario
            </button>
          </div>

          {schedules.length > 0 ? (
            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2.5 text-sm">
                  <span className="font-medium text-[#1a5c2e]">
                    {DAY_LABELS[s.day_of_week as DayOfWeek]} · {s.time_start.slice(0,5)}–{s.time_end.slice(0,5)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{s.type === 'arrival' ? '→ Campo' : '← Casa'}</span>
                    <button onClick={() => deleteSchedule(s.id)} className="text-red-400 hover:text-red-600 w-5 h-5 flex items-center justify-center">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">Nessun orario aggiunto</p>
          )}
        </div>
      </main>
    </div>
  )
}
