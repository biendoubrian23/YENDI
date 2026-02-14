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
    let activeTrips: Record<string, unknown>[] | null = null
    
    const { data: tripsWithDrivers, error: tripsErr } = await supabaseAdmin
      .from('scheduled_trips')
      .select('bus_id, departure_datetime, arrival_datetime, status, driver_id, route_id, routes:route_id(departure_city, arrival_city), drivers(first_name, last_name)')
      .eq('agency_id', adminLink.agency_id)
      .in('status', ['actif'])
      .lte('departure_datetime', now)
      .gte('arrival_datetime', now)

    if (tripsErr) {
      // Fallback sans JOIN drivers
      const { data: tripsNoDrivers } = await supabaseAdmin
        .from('scheduled_trips')
        .select('bus_id, departure_datetime, arrival_datetime, status, driver_id, route_id, routes:route_id(departure_city, arrival_city)')
        .eq('agency_id', adminLink.agency_id)
        .in('status', ['actif'])
        .lte('departure_datetime', now)
        .gte('arrival_datetime', now)
      activeTrips = tripsNoDrivers as Record<string, unknown>[] | null
    } else {
      activeTrips = tripsWithDrivers as Record<string, unknown>[] | null
    }

    // Map des bus_id vers leur trajet en cours (pour progression)
    const busTripMap = new Map<string, {
      departure_datetime: string
      arrival_datetime: string
      drivers: { first_name: string; last_name: string } | null
      departure_city: string
      arrival_city: string
    }>()
    if (activeTrips) {
      for (const trip of activeTrips) {
        const route = trip.routes as unknown as { departure_city: string; arrival_city: string } | null
        const drivers = trip.drivers as unknown as { first_name: string; last_name: string } | null
        busTripMap.set(trip.bus_id as string, {
          departure_datetime: trip.departure_datetime as string,
          arrival_datetime: trip.arrival_datetime as string,
          drivers: drivers || null,
          departure_city: route?.departure_city || '',
          arrival_city: route?.arrival_city || '',
        })
      }
    }

    // Mettre à jour le statut dynamiquement + ajouter info trajet
    const enrichedBuses = (buses || []).map((bus: Record<string, unknown>) => {
      // Si le bus est en maintenance ou hors service, garder son statut manuel
      if (bus.status === 'maintenance' || bus.status === 'hors_service') {
        return { ...bus, active_trip: null }
      }
      // Sinon, calculer dynamiquement
      const activeTrip = busTripMap.get(bus.id as string)
      if (activeTrip) {
        return { ...bus, status: 'en_route', active_trip: activeTrip }
      }
      return { ...bus, status: 'disponible', active_trip: null }
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
