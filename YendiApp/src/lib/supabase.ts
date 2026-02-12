import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types pour les clients mobiles
export interface ClientProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'homme' | 'femme' | 'autre' | null;
  avatar_url: string | null;
  role: 'client';
  referral_code: string | null;
  referred_by: string | null;
  loyalty_points: number;
  balance: number;
  refund_balance: number;
  is_verified: boolean;
  status: 'actif' | 'suspendu' | 'supprime';
  created_at: string;
  updated_at: string;
}
