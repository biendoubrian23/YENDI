import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function getAgencyId(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null

  const { data: agencyAdmin } = await supabaseAdmin
    .from('agency_admins')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  return agencyAdmin?.agency_id || null
}

// Générer les numéros de sièges à mettre en vente
// Privilégie les sièges de devant (proches du chauffeur)
function generateSeatNumbers(totalSeats: number, count: number): number[] {
  // Les sièges sont numérotés 1 à totalSeats
  // On privilégie les premiers sièges (devant)
  const allSeats = Array.from({ length: totalSeats }, (_, i) => i + 1)
  
  // On prend les 'count' premiers sièges (devant) + un peu d'aléatoire
  if (count >= totalSeats) return allSeats
  
  // 70% des places viennent de l'avant, 30% aléatoire du reste
  const frontCount = Math.ceil(count * 0.7)
  const randomCount = count - frontCount
  
  const frontSeats = allSeats.slice(0, frontCount)
  const remainingSeats = allSeats.slice(frontCount)
  
  // Mélanger le reste et prendre randomCount
  for (let i = remainingSeats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingSeats[i], remainingSeats[j]] = [remainingSeats[j], remainingSeats[i]]
  }
  const randomSeats = remainingSeats.slice(0, randomCount)
  
  return [...frontSeats, ...randomSeats].sort((a, b) => a - b)
}

// POST - Créer un trajet planifié
export async function POST(req: NextRequest) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const {
      route_id,
      bus_id,
      departure_datetime,
      arrival_datetime,
      driver_name,
      base_price,
      available_seats_count,
    } = body

    if (!route_id || !bus_id || !departure_datetime || !arrival_datetime) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (!base_price || base_price <= 0) {
      return NextResponse.json({ error: 'Le prix doit être supérieur à 0' }, { status: 400 })
    }

    if (!available_seats_count || available_seats_count <= 0) {
      return NextResponse.json({ error: 'Le nombre de places doit être supérieur à 0' }, { status: 400 })
    }

    // Récupérer le bus pour avoir le nombre total de sièges
    const { data: bus, error: busError } = await supabaseAdmin
      .from('buses')
      .select('seats')
      .eq('id', bus_id)
      .eq('agency_id', agencyId)
      .single()

    if (busError || !bus) {
      return NextResponse.json({ error: 'Bus introuvable' }, { status: 404 })
    }

    if (available_seats_count > bus.seats) {
      return NextResponse.json(
        { error: `Le nombre de places (${available_seats_count}) dépasse la capacité du bus (${bus.seats})` },
        { status: 400 }
      )
    }

    // Vérifier les conflits horaires avec d'autres trajets de ce bus
    const { data: conflictingTrips } = await supabaseAdmin
      .from('scheduled_trips')
      .select('id, departure_datetime, arrival_datetime')
      .eq('bus_id', bus_id)
      .in('status', ['actif'])
      .lt('departure_datetime', arrival_datetime)
      .gt('arrival_datetime', departure_datetime)

    if (conflictingTrips && conflictingTrips.length > 0) {
      return NextResponse.json(
        { error: 'Ce bus est déjà affecté à un trajet sur ce créneau horaire' },
        { status: 400 }
      )
    }

    // Générer les sièges à mettre en vente (priorité devant)
    const seatNumbers = generateSeatNumbers(bus.seats, available_seats_count)

    // Créer le trajet planifié
    const { data: trip, error: tripError } = await supabaseAdmin
      .from('scheduled_trips')
      .insert({
        agency_id: agencyId,
        route_id,
        bus_id,
        departure_datetime,
        arrival_datetime,
        driver_name: driver_name || null,
        base_price,
        total_seats: bus.seats,
        available_seats_count,
        available_seat_numbers: seatNumbers,
      })
      .select()
      .single()

    if (tripError) throw tripError

    // Créer les réservations de sièges (toutes disponibles)
    const seatReservations = seatNumbers.map(seatNum => ({
      scheduled_trip_id: trip.id,
      seat_number: seatNum,
      status: 'disponible',
    }))

    const { error: seatsError } = await supabaseAdmin
      .from('seat_reservations')
      .insert(seatReservations)

    if (seatsError) throw seatsError

    return NextResponse.json(trip, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Lister les trajets planifiés (filtrables par date)
export async function GET(req: NextRequest) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // format: YYYY-MM-DD

    let query = supabaseAdmin
      .from('scheduled_trips')
      .select('*, routes(*), buses(*)')
      .eq('agency_id', agencyId)
      .order('departure_datetime', { ascending: true })

    if (date) {
      // Filtrer les trajets dont le DÉPART ou l'ARRIVÉE tombe sur cette date
      // Un trajet qui part le 10 à 16h et arrive le 11 à 8h doit apparaître les 2 jours
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const nextDateStr = nextDate.toISOString().split('T')[0]
      query = query
        .lt('departure_datetime', `${nextDateStr}T00:00:00`)
        .gte('arrival_datetime', `${date}T00:00:00`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
