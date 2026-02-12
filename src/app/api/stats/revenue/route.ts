import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAgencyId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null

  const { data } = await supabaseAdmin
    .from('agency_admins')
    .select('agency_id')
    .eq('profile_id', user.id)
    .single()

  return data?.agency_id || null
}

// GET - Statistiques de revenus
export async function GET(req: NextRequest) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date et end_date requis' }, { status: 400 })
    }

    // Appeler la fonction SQL
    const { data, error } = await supabaseAdmin.rpc('get_agency_revenue_stats', {
      p_agency_id: agencyId,
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
