import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client côté navigateur (avec anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types utilitaires
export type UserRole = 'superadmin' | 'admin'
export type AgencyStatus = 'operationnel' | 'inactive' | 'suspendu' | 'en_attente' | 'configuration'
export type ProfileStatus = 'actif' | 'suspendu' | 'en_attente'
export type AdminRole = 'proprietaire' | 'manager' | 'operateur'
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
