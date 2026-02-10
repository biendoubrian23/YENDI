import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — liste les bus de l'agence de l'utilisateur authentifié
// Calcule dynamiquement le statut en fonction des trajets en cours
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    // Trouver l'agency_id de l'utilisateur
    const { data: adminLink } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id')
      .eq('profile_id', user.id)
      .single()

    if (!adminLink) {
      return NextResponse.json({ error: 'Aucune agence liée' }, { status: 403 })
    }

    const { data: buses, error } = await supabaseAdmin
      .from('buses')
      .select('*')
      .eq('agency_id', adminLink.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Récupérer tous les trajets actifs pour calculer le statut dynamique
    const now = new Date().toISOString()
    const { data: activeTrips } = await supabaseAdmin
      .from('scheduled_trips')
      .select('bus_id, departure_datetime, arrival_datetime, status')
      .eq('agency_id', adminLink.agency_id)
      .in('status', ['actif'])
      .lte('departure_datetime', now)
      .gte('arrival_datetime', now)

    // Map des bus_id qui sont actuellement "en route"
    const busesEnRoute = new Set<string>()
    if (activeTrips) {
      for (const trip of activeTrips) {
        busesEnRoute.add(trip.bus_id)
      }
    }

    // Mettre à jour le statut dynamiquement
    const enrichedBuses = (buses || []).map((bus: Record<string, unknown>) => {
      // Si le bus est en maintenance ou hors service, garder son statut manuel
      if (bus.status === 'maintenance' || bus.status === 'hors_service') {
        return bus
      }
      // Sinon, calculer dynamiquement
      if (busesEnRoute.has(bus.id as string)) {
        return { ...bus, status: 'en_route' }
      }
      return { ...bus, status: 'disponible' }
    })

    return NextResponse.json(enrichedBuses)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — legacy, avec agency_id dans le body
export async function POST(request: NextRequest) {
  try {
    const { agency_id } = await request.json()

    if (!agency_id) {
      return NextResponse.json({ error: 'agency_id requis' }, { status: 400 })
    }

    const { data: buses, error } = await supabaseAdmin
      .from('buses')
      .select('*')
      .eq('agency_id', agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ buses })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
