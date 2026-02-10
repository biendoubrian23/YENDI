import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { new_password } = body

    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 })
    }

    // Vérifier l'auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Mettre à jour le mot de passe via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du mot de passe', details: updateError.message }, { status: 500 })
    }

    // Mettre à jour le statut du profil en "actif"
    await supabaseAdmin
      .from('profiles')
      .update({ status: 'actif' })
      .eq('id', user.id)

    // Mettre à jour le statut de l'agence si nécessaire
    const { data: adminLinks } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id')
      .eq('profile_id', user.id)

    if (adminLinks && adminLinks.length > 0) {
      for (const link of adminLinks) {
        await supabaseAdmin
          .from('agencies')
          .update({ status: 'operationnel' })
          .eq('id', link.agency_id)
          .in('status', ['en_attente', 'configuration'])
      }
    }

    // Effacer le temp_password des invitations liées
    await supabaseAdmin
      .from('invitations')
      .update({ temp_password: null, status: 'accepted' })
      .eq('email', user.email)

    // Logger l'action
    await supabaseAdmin.from('activity_logs').insert({
      user_id: user.id,
      action: 'password_changed',
      entity_type: 'profile',
      entity_id: user.id,
      details: { first_login: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur API change-password:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
