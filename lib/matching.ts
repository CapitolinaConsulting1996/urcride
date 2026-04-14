/**
 * Algoritmo di matching per suggerire i passaggi migliori
 * Considera: deviazione, orari compatibili, tipo utente
 */

import type { RideOffer, UserProfile, TrainingSchedule, MatchSuggestion } from '@/types'
import { calculateDetour, haversineKm } from './routing'
import { URC_LOCATION } from '@/types'

interface MatchInput {
  passenger: UserProfile
  passenger_schedules: TrainingSchedule[]
  offers: Array<RideOffer & { driver: UserProfile; driver_schedules?: TrainingSchedule[] }>
  target_date: string
  target_time: string // HH:MM
}

/**
 * Calcola un punteggio di match 0-100 per ogni offerta
 * Più alto = più conveniente per entrambi
 */
export async function rankOffers(input: MatchInput): Promise<MatchSuggestion[]> {
  const results: MatchSuggestion[] = []

  for (const offer of input.offers) {
    if (offer.seats_available <= 0) continue
    if (offer.status !== 'active') continue

    // Compatibilità oraria: finestra di ±30 minuti
    const timeDiff = getTimeDiffMinutes(offer.time_departure, input.target_time)
    if (Math.abs(timeDiff) > 60) continue // troppo distante nell'orario

    // Calcola deviazione
    let detour_km = 0
    let detour_pct = 0
    let is_on_the_way = false

    const detour = await calculateDetour(
      { lat: offer.driver.lat, lng: offer.driver.lng },
      { lat: input.passenger.lat, lng: input.passenger.lng },
      URC_LOCATION
    )

    if (detour) {
      detour_km = detour.detour_km
      detour_pct = detour.detour_pct
      is_on_the_way = detour.is_on_the_way
    } else {
      // Fallback con Haversine
      const d_driver_passenger = haversineKm(
        { lat: offer.driver.lat, lng: offer.driver.lng },
        { lat: input.passenger.lat, lng: input.passenger.lng }
      )
      const d_direct = haversineKm(
        { lat: offer.driver.lat, lng: offer.driver.lng },
        URC_LOCATION
      )
      detour_km = Math.max(0, d_driver_passenger + haversineKm(
        { lat: input.passenger.lat, lng: input.passenger.lng }, URC_LOCATION
      ) - d_direct)
      detour_pct = (detour_km / d_direct) * 100
      is_on_the_way = detour_pct < 15
    }

    // Calcolo score composito
    let score = 100

    // Penalità deviazione
    score -= Math.min(50, detour_pct * 1.5)

    // Bonus "di passaggio"
    if (is_on_the_way) score += 20

    // Penalità differenza oraria
    score -= Math.abs(timeDiff) * 0.3

    // Bonus posti disponibili
    if (offer.seats_available > 1) score += 5

    // Bonus passaggio gratuito
    if (offer.price_per_seat === 0) score += 10

    score = Math.max(0, Math.min(100, score))

    results.push({
      offer: { ...offer, detour_km, match_score: score },
      detour_km,
      detour_pct,
      is_on_the_way,
      match_score: score,
    })
  }

  // Ordina per punteggio decrescente
  return results.sort((a, b) => b.match_score - a.match_score)
}

/**
 * Differenza in minuti tra due orari HH:MM
 */
function getTimeDiffMinutes(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number)
  const [h2, m2] = time2.split(':').map(Number)
  return (h1 * 60 + m1) - (h2 * 60 + m2)
}

/**
 * Genera il link WhatsApp per contattare un driver
 */
export function buildWhatsAppLink(phone: string, driverName: string, date: string, time: string): string {
  const msg = encodeURIComponent(
    `Ciao ${driverName}! Ho visto che sei disponibile per un passaggio il ${date} alle ${time} verso il campo URC (Via Flaminia 867). Potresti darmi un passaggio? Grazie!`
  )
  const number = phone.replace(/\D/g, '')
  return `https://wa.me/${number}?text=${msg}`
}
