import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

/**
 * GET /api/stats/revenue-chart?g=mois&agency=all
 * Retourne les données du graphique de revenus selon la granularité
 * g = jour | semaine | mois | annee
 * agency = 'all' | <agency_id>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const granularity = searchParams.get('g') || 'mois'
    const agencyId = searchParams.get('agency') || 'all'

    if (granularity === 'jour' || granularity === 'semaine') {
      return await getDailyWeeklyData(granularity, agencyId)
    }
    return await getMonthlyYearlyData(granularity, agencyId)
  } catch (err) {
    console.error('Revenue chart error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ─── Monthly / Yearly (from REAL seat_reservations data) ─── */
async function getMonthlyYearlyData(granularity: string, agencyId: string) {
  // Récupérer toutes les réservations confirmées
  let query = supabaseAdmin
    .from('seat_reservations')
    .select('reserved_at, scheduled_trips!inner(base_price, agency_id)')
    .eq('status', 'confirme')

  const { data: reservations, error } = await query
  if (error) throw error

  // Filter by agency if needed
  const filtered = agencyId !== 'all'
    ? (reservations || []).filter((r: any) => r.scheduled_trips?.agency_id === agencyId)
    : (reservations || [])

  const now = new Date()

  if (granularity === 'mois') {
    // Last 12 months
    const monthlyMap: Record<string, number> = {}
    
    filtered.forEach((r: any) => {
      const date = new Date(r.reserved_at)
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      const revenue = r.scheduled_trips?.base_price || 0
      monthlyMap[key] = (monthlyMap[key] || 0) + revenue
    })

    const data = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const key = `${y}-${m}`
      const revenue = monthlyMap[key] || 0
      
      data.push({
        label: `${MONTH_NAMES[m - 1]} ${y}`,
        revenue,
        commission: Math.round(revenue * 0.1), // 10% commission par défaut
      })
    }
    return NextResponse.json({ data })
  }

  // Année — group by year
  const yearMap: Record<number, number> = {}
  filtered.forEach((r: any) => {
    const year = new Date(r.reserved_at).getFullYear()
    const revenue = r.scheduled_trips?.base_price || 0
    yearMap[year] = (yearMap[year] || 0) + revenue
  })

  const data = Object.entries(yearMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, revenue]) => ({ 
      label: year, 
      revenue,
      commission: Math.round(revenue * 0.1)
    }))

  return NextResponse.json({ data })
}

/* ─── Daily / Weekly (from seat_reservations + scheduled_trips) ─── */
async function getDailyWeeklyData(granularity: string, agencyId: string) {
  const daysBack = granularity === 'jour' ? 30 : 84
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  // Build query
  const filterAgency = agencyId !== 'all' ? agencyId : null

  // Use RPC or manual query — supabaseAdmin bypasses RLS
  const { data: reservations, error } = await supabaseAdmin
    .from('seat_reservations')
    .select('reserved_at, scheduled_trips!inner(base_price, agency_id)')
    .in('status', ['reserve', 'confirme'])
    .gte('reserved_at', startDate.toISOString())

  if (error) throw error

  // Filter by agency if needed (post-filter since nested filter syntax varies)
  const filtered = filterAgency
    ? (reservations || []).filter((r: Record<string, unknown>) => {
        const trip = r.scheduled_trips as Record<string, unknown> | null
        return trip?.agency_id === filterAgency
      })
    : reservations || []

  // Group by day
  const dayMap: Record<string, number> = {}
  filtered.forEach((r: Record<string, unknown>) => {
    const reservedAt = r.reserved_at as string | null
    if (!reservedAt) return
    const day = reservedAt.split('T')[0]
    const trip = r.scheduled_trips as Record<string, unknown> | null
    dayMap[day] = (dayMap[day] || 0) + ((trip?.base_price as number) || 0)
  })

  // Fill all days
  const allDays: { key: string; label: string; revenue: number; commission: number }[] = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const rev = dayMap[key] || 0
    allDays.push({
      key,
      label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      revenue: rev,
      commission: Math.round(rev * 0.1),
    })
  }

  if (granularity === 'jour') {
    return NextResponse.json({
      data: allDays.map(({ label, revenue, commission }) => ({ label, revenue, commission })),
    })
  }

  // Semaine — group by weeks of 7 days
  const weeklyData: { label: string; revenue: number; commission: number }[] = []
  for (let i = 0; i < allDays.length; i += 7) {
    const week = allDays.slice(i, i + 7)
    const totalRev = week.reduce((s, d) => s + d.revenue, 0)
    const startLabel = week[0]?.label || ''
    const endLabel = week[week.length - 1]?.label || ''
    weeklyData.push({
      label: `${startLabel}–${endLabel}`,
      revenue: totalRev,
      commission: Math.round(totalRev * 0.1),
    })
  }

  return NextResponse.json({ data: weeklyData })
}
