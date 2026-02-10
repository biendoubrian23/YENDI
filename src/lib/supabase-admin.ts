import { createClient } from '@supabase/supabase-js'

// Client côté serveur avec service_role (pour les API routes uniquement)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
