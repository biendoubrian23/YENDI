import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TripRecord {
  id: string
  bus_id: string
  departure_datetime: string
  arrival_datetime: string
  status: string
  routes: {
    departure_city: string
    arrival_city: string
  } | null
}

function normTrips(raw: unknown[]): TripRecord[] {
  return (raw as Record<string, unknown>[]).map(t => {
    const routes = t.routes
    let routeObj: TripRecord['routes'] = null
    if (Array.isArray(routes) && routes.length > 0) {
      routeObj = routes[0] as { departure_city: string; arrival_city: string }
    } else if (routes && typeof routes === 'object' && !Array.isArray(routes)) {
      routeObj = routes as { departure_city: string; arrival_city: string }
    }
    return {
      id: t.id as string,
      bus_id: t.bus_id as string,
      departure_datetime: t.departure_datetime as string,
      arrival_datetime: t.arrival_datetime as string,
      status: t.status as string,
      routes: routeObj,
    }
  })
}

// GET /api/buses/availability?bus_id=xxx&departure=ISO&arrival=ISO&departure_city=xxx&exclude_trip=xxx
// Vérifie si un bus est disponible pour un créneau donné
// Retourne: { available, reason?, last_position? }
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

    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('bus_id')
    const departureStr = searchParams.get('departure')
    const arrivalStr = searchParams.get('arrival')
    const departureCity = searchParams.get('departure_city')
    const excludeTrip = searchParams.get('exclude_trip') // Pour le mode édition

    if (!busId || !departureStr || !arrivalStr) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const departure = new Date(departureStr)
    const arrival = new Date(arrivalStr)

    // Récupérer tous les trajets actifs de ce bus
    let query = supabaseAdmin
      .from('scheduled_trips')
      .select('id, bus_id, departure_datetime, arrival_datetime, status, routes(departure_city, arrival_city)')
      .eq('bus_id', busId)
      .in('status', ['actif'])

    if (excludeTrip) {
      query = query.neq('id', excludeTrip)
    }

    const { data: trips } = await query

    if (!trips || trips.length === 0) {
      return NextResponse.json({
        available: true,
        last_position: null,
      })
    }

    // 1. Vérifier les conflits horaires (chevauchement)
    const normalizedTrips = normTrips(trips)
    for (const trip of normalizedTrips) {
      const tripDep = new Date(trip.departure_datetime)
      const tripArr = new Date(trip.arrival_datetime)

      // Chevauchement : le nouveau trajet commence avant que l'ancien finisse
      // ET le nouveau trajet finit après que l'ancien commence
      if (departure < tripArr && arrival > tripDep) {
        const depTime = tripDep.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })
        const arrTime = tripArr.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })
        const route = trip.routes
        return NextResponse.json({
          available: false,
          reason: `Ce bus est déjà affecté à un trajet ${route ? `${route.departure_city} → ${route.arrival_city}` : ''} de ${depTime} à ${arrTime}`,
        })
      }
    }

    // 2. Vérifier la position du bus (dernier trajet terminé avant le nouveau départ)
    // Trouver le dernier trajet qui se termine AVANT le nouveau départ
    const tripsBeforeDeparture = normalizedTrips
      .filter(t => new Date(t.arrival_datetime) <= departure)
      .sort((a, b) => new Date(b.arrival_datetime).getTime() - new Date(a.arrival_datetime).getTime())

    if (tripsBeforeDeparture.length > 0 && departureCity) {
      const lastTrip = tripsBeforeDeparture[0]
      const lastArrival = new Date(lastTrip.arrival_datetime)
      const lastArrivalCity = lastTrip.routes?.arrival_city

      if (lastArrivalCity && lastArrivalCity !== departureCity) {
        // Le bus est à une autre ville que celle de départ
        const timeDiffHours = (departure.getTime() - lastArrival.getTime()) / (1000 * 60 * 60)

        if (timeDiffHours < 2) {
          // Moins de 2h d'écart : pas le temps de déplacer le bus
          return NextResponse.json({
            available: false,
            reason: `Ce bus sera à ${lastArrivalCity} (dernier trajet). Moins de 2h d'écart — il ne peut pas partir de ${departureCity}. Il faut au moins 2h d'écart.`,
            last_position: lastArrivalCity,
          })
        }
      }
    }

    // Aussi vérifier les trajets qui se terminent APRÈS le nouveau départ (le bus est en route)
    // Déjà couvert par la vérification de chevauchement ci-dessus

    // Déterminer la dernière position connue
    const allSorted = normalizedTrips.slice()
      .sort((a, b) => new Date(b.arrival_datetime).getTime() - new Date(a.arrival_datetime).getTime())
    const lastPosition = allSorted.length > 0 ? allSorted[0].routes?.arrival_city || null : null

    return NextResponse.json({
      available: true,
      last_position: lastPosition,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
