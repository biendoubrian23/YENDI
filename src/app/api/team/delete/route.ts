import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// DELETE - Supprimer un membre de l'équipe
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est proprietaire
    const { data: currentAdmin } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!currentAdmin || currentAdmin.role !== 'proprietaire') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'ID du membre manquant' }, { status: 400 })
    }

    // Vérifier que le membre appartient à la même agence
    const { data: member } = await supabaseAdmin
      .from('agency_admins')
      .select('id, profile_id, role, is_primary')
      .eq('id', memberId)
      .eq('agency_id', currentAdmin.agency_id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 })
    }

    // Interdire de supprimer le propriétaire principal
    if (member.is_primary && member.role === 'proprietaire') {
      return NextResponse.json({ error: 'Impossible de supprimer le propriétaire principal' }, { status: 403 })
    }

    // 1. Supprimer le lien agency_admin
    const { error: deleteAdminError } = await supabaseAdmin
      .from('agency_admins')
      .delete()
      .eq('id', memberId)

    if (deleteAdminError) {
      console.error('Erreur suppression agency_admin:', deleteAdminError)
      return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
    }

    // 2. Supprimer le profil (cascade supprime aussi auth.users via trigger)
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', member.profile_id)

    if (deleteProfileError) {
      console.error('Erreur suppression profil:', deleteProfileError)
      // On continue quand même, le lien est déjà supprimé
    }

    // 3. Supprimer l'utilisateur auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(member.profile_id)
    if (deleteAuthError) {
      console.error('Erreur suppression auth user:', deleteAuthError)
    }

    console.log(`🗑️ Membre supprimé: ${member.profile_id} de agence ${currentAdmin.agency_id}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur API /api/team/delete:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
