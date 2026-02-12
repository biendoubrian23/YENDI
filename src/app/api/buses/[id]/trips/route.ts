import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/buses/[id]/trips — Historique de tous les trajets d'un bus
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    const { data: adminLink } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id')
      .eq('profile_id', user.id)
      .single()

    if (!adminLink) {
      return NextResponse.json({ error: 'Aucune agence liée' }, { status: 403 })
    }

    const { id: busId } = await params

    // Vérifier que le bus appartient à l'agence
    const { data: bus } = await supabaseAdmin
      .from('buses')
      .select('id, brand, model, number')
      .eq('id', busId)
      .eq('agency_id', adminLink.agency_id)
      .single()

    if (!bus) {
      return NextResponse.json({ error: 'Bus introuvable' }, { status: 404 })
    }

    // Récupérer tous les trajets de ce bus, du plus récent au plus ancien
    let { data: trips, error } = await supabaseAdmin
      .from('scheduled_trips')
      .select('id, departure_datetime, arrival_datetime, driver_id, base_price, total_seats, available_seats_count, status, routes(departure_city, departure_location, arrival_city, arrival_location, stops), drivers(first_name, last_name)')
      .eq('bus_id', busId)
      .eq('agency_id', adminLink.agency_id)
      .order('departure_datetime', { ascending: false })

    // Fallback si la table drivers n'existe pas encore
    if (error) {
      const fallback = await supabaseAdmin
        .from('scheduled_trips')
        .select('id, departure_datetime, arrival_datetime, driver_id, base_price, total_seats, available_seats_count, status, routes(departure_city, departure_location, arrival_city, arrival_location, stops)')
        .eq('bus_id', busId)
        .eq('agency_id', adminLink.agency_id)
        .order('departure_datetime', { ascending: false })
      trips = fallback.data
      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json({ bus, trips: trips || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
