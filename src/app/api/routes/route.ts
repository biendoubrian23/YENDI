import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

// Récupérer l'agency_id de l'utilisateur connecté
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

// POST - Créer une route (ligne)
export async function POST(req: NextRequest) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { departure_city, departure_location, arrival_city, arrival_location, stops } = body

    if (!departure_city || !arrival_city) {
      return NextResponse.json({ error: 'Ville de départ et d\'arrivée requises' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('routes')
      .insert({
        agency_id: agencyId,
        departure_city,
        departure_location: departure_location || null,
        arrival_city,
        arrival_location: arrival_location || null,
        stops: stops || [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Lister les routes de l'agence
export async function GET(req: NextRequest) {
  try {
    const agencyId = await getAgencyId(req)
    if (!agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
