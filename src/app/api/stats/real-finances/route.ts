import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AgencyFinancial {
  agency_id: string
  agency_name: string
  agency_color: string
  commission_rate: number
  revenue: number
  reservations_count: number
  trips_count: number
}

/**
 * GET /api/stats/real-finances
 * Calcule les statistiques financières réelles depuis seat_reservations
 * au lieu de financial_records (qui est vide)
 */
export async function GET() {
  try {
    // Récupérer toutes les réservations confirmées avec les infos des trajets, booking_groups et agences
    const { data: reservations, error } = await supabaseAdmin
      .from('seat_reservations')
      .select(`
        id,
        reserved_at,
        status,
        booking_groups (
          unit_price
        ),
        scheduled_trips (
          id,
          base_price,
          departure_datetime,
          agency_id,
          agencies (
            id,
            name,
            color,
            commission_rate
          )
        )
      `)
      .eq('status', 'confirme')

    if (error) throw error

    // Agréger par agence
    const agencyMap: Record<string, AgencyFinancial> = {}
    const tripsByAgency: Record<string, Set<string>> = {}

    ;(reservations || []).forEach((res: any) => {
      const trip = res.scheduled_trips
      if (!trip || !trip.agencies) return

      const agencyId = trip.agency_id
      const agency = trip.agencies
      // Utiliser le prix dynamique (booking_groups.unit_price) s'il existe, sinon base_price
      const bg = (res as any).booking_groups
      const revenue = (bg && bg.unit_price) ? bg.unit_price : (trip.base_price || 0)

      if (!agencyMap[agencyId]) {
        agencyMap[agencyId] = {
          agency_id: agencyId,
          agency_name: agency.name || 'Inconnu',
          agency_color: agency.color || '#6b7280',
          commission_rate: agency.commission_rate || 10,
          revenue: 0,
          reservations_count: 0,
          trips_count: 0,
        }
        tripsByAgency[agencyId] = new Set()
      }

      agencyMap[agencyId].revenue += revenue
      agencyMap[agencyId].reservations_count += 1
      tripsByAgency[agencyId].add(trip.id)
    })

    // Ajouter le nombre de trajets uniques
    Object.keys(agencyMap).forEach((agencyId) => {
      agencyMap[agencyId].trips_count = tripsByAgency[agencyId].size
    })

    const agencies = Object.values(agencyMap)

    // Calculer les totaux
    const totalRevenue = agencies.reduce((sum, a) => sum + a.revenue, 0)
    const totalReservations = agencies.reduce((sum, a) => sum + a.reservations_count, 0)
    const totalTrips = agencies.reduce((sum, a) => sum + a.trips_count, 0)
    const totalCommission = agencies.reduce(
      (sum, a) => sum + (a.revenue * a.commission_rate) / 100,
      0
    )

    return NextResponse.json({
      totals: {
        revenue: totalRevenue,
        commission: totalCommission,
        reservations: totalReservations,
        trips: totalTrips,
      },
      agencies: agencies.map((a) => ({
        ...a,
        commission: (a.revenue * a.commission_rate) / 100,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    console.error('Real finances error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
