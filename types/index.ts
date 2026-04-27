export type UserRole = 'passenger' | 'driver' | 'rider'
export type RoleInClub = 'parent' | 'athlete' | 'coach' | 'staff' | 'volunteer' | 'other'
export type RideStatus = 'active' | 'full' | 'cancelled' | 'completed'
export type LiveStatus = 'not_started' | 'departing' | 'on_way' | 'arrived' | 'completed'
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
export type Direction = 'to_field' | 'from_field' | 'both'
export type EventType = 'training' | 'match' | 'away' | 'social' | 'meeting' | 'other'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Team {
  id: string
  name: string
  category: string | null
  color: string
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string | null
  whatsapp_number: string | null
  avatar_url: string | null
  address: string
  lat: number
  lng: number
  zone: string | null
  role: UserRole
  role_in_club: RoleInClub
  team_id: string | null
  team?: Team
  bio: string | null
  is_verified: boolean
  is_admin: boolean
  trips_completed: number
  rating_avg: number
  created_at: string
}

export interface TrainingSchedule {
  id: string
  user_id: string
  day_of_week: DayOfWeek
  time_start: string
  time_end: string
  type: 'arrival' | 'departure'
}

export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly'

export interface ClubEvent {
  id: string
  title: string
  description: string | null
  event_type: EventType
  date: string
  time_start: string
  time_end: string | null
  location: string
  lat: number
  lng: number
  team_id: string | null
  team?: Team
  created_by: string | null
  created_at: string
  recurrence: RecurrenceType
  recurrence_end_date: string | null
  recurrence_group_id: string | null
  // computed
  rides_count?: number
  seats_available?: number
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Non si ripete',
  weekly: 'Ogni settimana',
  biweekly: 'Ogni 2 settimane',
  monthly: 'Ogni mese',
}

export interface RideOffer {
  id: string
  driver_id: string
  driver?: UserProfile
  event_id: string | null
  event?: ClubEvent
  team_id: string | null
  team?: Team
  date: string
  time_departure: string
  return_time: string | null
  direction: Direction
  seats_available: number
  seats_total: number
  price_per_seat: number
  has_luggage: boolean
  preferences: string[]
  notes: string | null
  status: RideStatus
  live_status: LiveStatus
  created_at: string
  requests?: RideRequest[]
  detour_km?: number
  match_score?: number
}

export interface RideRequest {
  id: string
  ride_offer_id: string
  passenger_id: string
  passenger?: UserProfile
  seats_requested: number
  status: RequestStatus
  message: string | null
  created_at: string
  ride_offer?: RideOffer
}

export interface RiderProfile {
  user_id: string
  user?: UserProfile
  price_per_seat: number
  bio: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_color: string | null
  seats_total: number
  is_available: boolean
}

export interface Rating {
  id: string
  ride_offer_id: string
  rater_id: string
  rated_id: string
  score: number
  comment: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  sender?: UserProfile
  receiver?: UserProfile
  content: string
  read: boolean
  created_at: string
}

export interface MatchSuggestion {
  offer: RideOffer
  detour_km: number
  detour_pct: number
  is_on_the_way: boolean
  match_score: number
}

export interface MapPin {
  user: UserProfile
  role: UserRole
  schedules: TrainingSchedule[]
  rider_profile?: RiderProfile
  has_active_offer?: boolean
}

// ── Labels ──────────────────────────────────────────────────

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lunedì', tuesday: 'Martedì', wednesday: 'Mercoledì',
  thursday: 'Giovedì', friday: 'Venerdì', saturday: 'Sabato', sunday: 'Domenica',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  passenger: 'Passeggero',
  driver: 'Driver (gratuito)',
  rider: 'Rider (a pagamento)',
}

export const ROLE_IN_CLUB_LABELS: Record<RoleInClub, string> = {
  parent: 'Genitore', athlete: 'Atleta', coach: 'Allenatore',
  staff: 'Staff', volunteer: 'Volontario', other: 'Altro',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: 'Allenamento', match: 'Partita', away: 'Trasferta',
  social: 'Evento sociale', meeting: 'Riunione', other: 'Altro',
}

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  training: '🏉', match: '⚔️', away: '🚌',
  social: '🎉', meeting: '📋', other: '📌',
}

export const DIRECTION_LABELS: Record<Direction, string> = {
  to_field: '→ Al campo', from_field: '← Da casa', both: '↔ Andata e ritorno',
}

export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  not_started: 'Non iniziato', departing: '🚀 Sto partendo',
  on_way: '🚗 In viaggio', arrived: '✅ Arrivato', completed: '🏁 Completato',
}

export const URC_LOCATION = {
  lat: 41.9524171,
  lng: 12.4815598,
  address: 'Via Flaminia, 867, 00191 Roma RM',
  name: 'Campo URC - Via Flaminia 867',
}
