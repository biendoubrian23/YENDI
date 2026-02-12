import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
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

    const { firstName, lastName, phone } = await req.json()

    // Validation
    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    // Créer le chauffeur
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .insert({
        agency_id: agencyAdmin.agency_id,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        status: 'actif',
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création chauffeur:', error)
      return NextResponse.json({ error: 'Erreur lors de la création du chauffeur' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Chauffeur créé avec succès',
      driver,
    })

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
