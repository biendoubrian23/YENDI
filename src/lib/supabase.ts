import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client côté navigateur (avec anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types utilitaires
export type UserRole = 'superadmin' | 'admin'
export type AgencyStatus = 'operationnel' | 'inactive' | 'suspendu' | 'en_attente' | 'configuration'
export type ProfileStatus = 'actif' | 'suspendu' | 'en_attente'
export type AdminRole = 'proprietaire' | 'manager' | 'operateur' | 'visiteur'
export type ReversementStatus = 'paye' | 'en_attente' | 'bloque'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  status: ProfileStatus
  created_at: string
  updated_at: string
}

export interface Agency {
  id: string
  name: string
  siret_number: string | null
  website: string | null
  address: string | null
  city: string
  country_code: string
  logo_url: string | null
  color: string
  plan: string
  commission_rate: number
  status: AgencyStatus
  created_at: string
  updated_at: string
}

export interface AgencyAdmin {
  id: string
  agency_id: string
  profile_id: string
  role: AdminRole
  is_primary: boolean
  created_at: string
  profiles?: Profile
  agencies?: Agency
}

export interface FinancialRecord {
  id: string
  agency_id: string
  month: number
  year: number
  ca_brut: number
  commission_rate: number
  commission_amount: number
  trips_count: number
  reversement_status: ReversementStatus
  created_at: string
  agencies?: Agency
}

export type BusStatus = 'disponible' | 'en_route' | 'maintenance' | 'hors_service'

export interface SeatLayout {
  left: number       // sièges côté gauche par rangée
  right: number      // sièges côté droit par rangée
  back_row: number   // sièges dernière rangée (0 = pas de rangée arrière)
  rows: number       // nombre de rangées normales
}

export interface ActiveTrip {
  departure_datetime: string
  arrival_datetime: string
  drivers: {
    first_name: string
    last_name: string
  } | null
  departure_city: string
  arrival_city: string
}

export interface BusItem {
  id: string
  agency_id: string
  brand: string
  model: string
  number: string
  plate: string
  seats: number
  seat_layout: SeatLayout
  status: BusStatus
  fuel_level: number
  mileage: number
  features: string[]
  current_driver: string | null
  current_line: string | null
  last_revision: string | null
  next_revision: string | null
  is_vip: boolean
  created_at: string
  updated_at: string
  active_trip?: ActiveTrip | null
}

export interface Invitation {
  id: string
  email: string
  full_name: string
  agency_id: string
  role: AdminRole
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  created_at: string
  agencies?: Agency
}

// ============================================================
// Routes (lignes) et Scheduled Trips (trajets planifiés)
// ============================================================

export interface RouteStop {
  city: string
  location?: string
}

export interface RouteItem {
  id: string
  agency_id: string
  departure_city: string
  departure_location: string | null
  arrival_city: string
  arrival_location: string | null
  stops: RouteStop[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ScheduledTripStatus = 'actif' | 'inactif' | 'termine' | 'annule'

export interface ScheduledTrip {
  id: string
  agency_id: string
  route_id: string
  bus_id: string
  departure_datetime: string
  arrival_datetime: string
  driver_id: string | null
  base_price: number
  yield_enabled: boolean
  total_seats: number
  available_seats_count: number
  available_seat_numbers: number[]
  status: ScheduledTripStatus
  created_at: string
  updated_at: string
  // Relations jointes
  routes?: RouteItem
  buses?: BusItem
  drivers?: {
    first_name: string
    last_name: string
  } | null
}

export type SeatStatus = 'disponible' | 'reserve' | 'confirme' | 'annule'

export interface SeatReservation {
  id: string
  scheduled_trip_id: string
  seat_number: number
  status: SeatStatus
  passenger_name: string | null
  passenger_phone: string | null
  reserved_at: string | null
  created_at: string
}

// Liste des villes principales du Cameroun
export const CAMEROON_CITIES = [
  'Douala',
  'Yaoundé',
  'Bafoussam',
  'Bamenda',
  'Garoua',
  'Maroua',
  'Ngaoundéré',
  'Bertoua',
  'Ebolowa',
  'Kribi',
  'Limbé',
  'Buéa',
  'Nkongsamba',
  'Kumba',
  'Dschang',
  'Foumban',
  'Edéa',
  'Mbalmayo',
  'Sangmélima',
  'Tiko',
]
