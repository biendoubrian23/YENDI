import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'agence de l'admin
    const { data: agencyAdmin } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id')
      .eq('profile_id', user.id)
      .single()

    if (!agencyAdmin) {
      return NextResponse.json({ error: 'Agence non trouvée' }, { status: 404 })
    }

    // Récupérer tous les chauffeurs de l'agence
    const { data: drivers, error } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('agency_id', agencyAdmin.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération chauffeurs:', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération des chauffeurs' }, { status: 500 })
    }

    return NextResponse.json(drivers || [])

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
