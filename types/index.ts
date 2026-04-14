export type UserRole = 'passenger' | 'driver' | 'rider'
export type RideStatus = 'active' | 'full' | 'cancelled' | 'completed'
export type RequestStatus = 'pending' | 'accepted' | 'rejected'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

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
  role: UserRole
  bio: string | null
  created_at: string
}

export interface TrainingSchedule {
  id: string
  user_id: string
  day_of_week: DayOfWeek
  time_start: string // HH:MM
  time_end: string   // HH:MM
  type: 'arrival' | 'departure'
}

export interface RideOffer {
  id: string
  driver_id: string
  driver?: UserProfile
  date: string // ISO date
  time_departure: string // HH:MM
  seats_available: number
  seats_total: number
  price_per_seat: number // 0 = gratuito
  notes: string | null
  status: RideStatus
  created_at: string
  requests?: RideRequest[]
  // computed
  detour_km?: number
  match_score?: number
}

export interface RideRequest {
  id: string
  ride_offer_id: string
  passenger_id: string
  passenger?: UserProfile
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

export interface Conversation {
  other_user: UserProfile
  last_message: Message
  unread_count: number
}

export interface MatchSuggestion {
  offer: RideOffer
  detour_km: number
  detour_pct: number
  is_on_the_way: boolean
  match_score: number // 0-100
}

// Map pin
export interface MapPin {
  user: UserProfile
  role: UserRole
  schedules: TrainingSchedule[]
  rider_profile?: RiderProfile
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lunedì',
  tuesday: 'Martedì',
  wednesday: 'Mercoledì',
  thursday: 'Giovedì',
  friday: 'Venerdì',
  saturday: 'Sabato',
  sunday: 'Domenica',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  passenger: 'Passeggero',
  driver: 'Driver (gratuito)',
  rider: 'Rider (a pagamento)',
}

// Campo rugby URC - Via Flaminia 867, Roma (coordinate verificate Nominatim)
export const URC_LOCATION = {
  lat: 41.9524171,
  lng: 12.4815598,
  address: 'Via Flaminia, 867, 00191 Roma RM',
  name: 'Campo URC - Via Flaminia 867',
}
