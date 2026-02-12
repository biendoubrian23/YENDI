import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { driverId, firstName, lastName, phone, status } = await req.json()

    if (!driverId) {
      return NextResponse.json({ error: 'ID du chauffeur requis' }, { status: 400 })
    }

    // Construire l'objet de mise à jour
    const updates: Record<string, string> = {}
    if (firstName) updates.first_name = firstName
    if (lastName) updates.last_name = lastName
    if (phone) updates.phone = phone
    if (status) updates.status = status

    // Mettre à jour le chauffeur
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .update(updates)
      .eq('id', driverId)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour chauffeur:', error)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du chauffeur' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Chauffeur mis à jour avec succès',
      driver,
    })

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
