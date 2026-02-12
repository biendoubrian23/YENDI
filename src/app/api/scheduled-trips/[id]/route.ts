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

// GET - Récupérer un trajet par ID (avec route + bus)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    let { data, error } = await supabaseAdmin
      .from('scheduled_trips')
      .select('*, routes(*), buses(*), drivers(first_name, last_name)')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .single()

    // Fallback si la table drivers n'existe pas encore
    if (error) {
      const fallback = await supabaseAdmin
        .from('scheduled_trips')
        .select('*, routes(*), buses(*)')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error || !data) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT - Mettre à jour un trajet et sa route
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const {
      route_id,
      route_data,
      bus_id,
      departure_datetime,
      arrival_datetime,
      driver_id,
      base_price,
      available_seats_count,
    } = body

    // Mettre à jour la route si route_data est fourni
    if (route_id && route_data) {
      const { error: routeError } = await supabaseAdmin
        .from('routes')
        .update({
          departure_city: route_data.departure_city,
          departure_location: route_data.departure_location || null,
          arrival_city: route_data.arrival_city,
          arrival_location: route_data.arrival_location || null,
          stops: route_data.stops || [],
        })
        .eq('id', route_id)
        .eq('agency_id', agencyId)

      if (routeError) throw routeError
    }

    // Récupérer le bus pour le total_seats
    let total_seats: number | undefined
    if (bus_id) {
      const { data: bus } = await supabaseAdmin
        .from('buses')
        .select('seats')
        .eq('id', bus_id)
        .eq('agency_id', agencyId)
        .single()

      if (!bus) {
        return NextResponse.json({ error: 'Bus introuvable' }, { status: 404 })
      }
      total_seats = bus.seats

      if (available_seats_count > bus.seats) {
        return NextResponse.json(
          { error: `Le nombre de places (${available_seats_count}) dépasse la capacité du bus (${bus.seats})` },
          { status: 400 }
        )
      }
    }

    // Regénérer les sièges si le nombre de places a changé
    const updateData: Record<string, unknown> = {}
    if (bus_id) updateData.bus_id = bus_id
    if (departure_datetime) updateData.departure_datetime = departure_datetime
    if (arrival_datetime) updateData.arrival_datetime = arrival_datetime
    if (driver_id !== undefined) updateData.driver_id = driver_id || null
    if (base_price !== undefined) updateData.base_price = base_price
    if (total_seats) updateData.total_seats = total_seats
    if (available_seats_count !== undefined) {
      updateData.available_seats_count = available_seats_count

      // Regénérer les numéros de sièges
      const allSeats = Array.from({ length: total_seats || 46 }, (_, i) => i + 1)
      const count = available_seats_count
      let seatNumbers: number[]
      if (count >= allSeats.length) {
        seatNumbers = allSeats
      } else {
        const frontCount = Math.ceil(count * 0.7)
        const randomCount = count - frontCount
        const frontSeats = allSeats.slice(0, frontCount)
        const remainingSeats = allSeats.slice(frontCount)
        for (let i = remainingSeats.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remainingSeats[i], remainingSeats[j]] = [remainingSeats[j], remainingSeats[i]]
        }
        seatNumbers = [...frontSeats, ...remainingSeats.slice(0, randomCount)].sort((a, b) => a - b)
      }
      updateData.available_seat_numbers = seatNumbers

      // Supprimer les anciens sièges et recréer
      await supabaseAdmin
        .from('seat_reservations')
        .delete()
        .eq('scheduled_trip_id', id)
        .eq('status', 'disponible')

      const seatReservations = seatNumbers.map(seatNum => ({
        scheduled_trip_id: id,
        seat_number: seatNum,
        status: 'disponible' as const,
      }))

      if (seatReservations.length > 0) {
        await supabaseAdmin
          .from('seat_reservations')
          .upsert(seatReservations, { onConflict: 'scheduled_trip_id,seat_number' })
      }
    }

    let { data, error } = await supabaseAdmin
      .from('scheduled_trips')
      .update(updateData)
      .eq('id', id)
      .eq('agency_id', agencyId)
      .select('*, routes(*), buses(*), drivers(first_name, last_name)')
      .single()

    // Fallback si drivers n'existe pas encore
    if (error) {
      const fallback = await supabaseAdmin
        .from('scheduled_trips')
        .update(updateData)
        .eq('id', id)
        .eq('agency_id', agencyId)
        .select('*, routes(*), buses(*)')
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH - Mettre à jour le statut d'un trajet (activer/désactiver)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['actif', 'inactif', 'termine', 'annule'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas de réservations confirmées si on désactive
    if (status === 'inactif' || status === 'annule') {
      const { data: reservations } = await supabaseAdmin
        .from('seat_reservations')
        .select('id')
        .eq('scheduled_trip_id', id)
        .in('status', ['reserve', 'confirme'])

      if (reservations && reservations.length > 0) {
        return NextResponse.json(
          { error: `Impossible de désactiver : ${reservations.length} réservation(s) en cours` },
          { status: 400 }
        )
      }
    }

    let { data, error } = await supabaseAdmin
      .from('scheduled_trips')
      .update({ status })
      .eq('id', id)
      .eq('agency_id', agencyId)
      .select('*, routes(*), buses(*), drivers(first_name, last_name)')
      .single()

    if (error) {
      const fallback = await supabaseAdmin
        .from('scheduled_trips')
        .update({ status })
        .eq('id', id)
        .eq('agency_id', agencyId)
        .select('*, routes(*), buses(*)')
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Supprimer un trajet
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Les seat_reservations seront supprimées en cascade
    const { error } = await supabaseAdmin
      .from('scheduled_trips')
      .delete()
      .eq('id', id)
      .eq('agency_id', agencyId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
