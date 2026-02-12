import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const driverId = searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json({ error: 'ID du chauffeur requis' }, { status: 400 })
    }

    // Supprimer le chauffeur
    const { error } = await supabaseAdmin
      .from('drivers')
      .delete()
      .eq('id', driverId)

    if (error) {
      console.error('Erreur suppression chauffeur:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression du chauffeur' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Chauffeur supprimé avec succès' })

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
