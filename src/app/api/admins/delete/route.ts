import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('id')
    const agencyId = searchParams.get('agencyId')

    if (!adminId || !agencyId) {
      return NextResponse.json(
        { error: 'ID admin ou agence manquant' },
        { status: 400 }
      )
    }

    // 1. Vérifier combien d'admins il y a dans cette agence
    const { data: adminsCount, error: countError } = await supabaseAdmin
      .from('agency_admins')
      .select('id', { count: 'exact' })
      .eq('agency_id', agencyId)

    if (countError) {
      console.error('Erreur comptage admins:', countError)
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      )
    }

    const totalAdmins = adminsCount?.length || 0

    if (totalAdmins <= 1) {
      return NextResponse.json(
        { error: 'Impossible de supprimer le seul administrateur de l\'agence. Veuillez d\'abord créer un autre administrateur.' },
        { status: 400 }
      )
    }

    // 2. Récupérer le profile_id de l'admin à supprimer
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('agency_admins')
      .select('profile_id')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData) {
      console.error('Erreur récupération admin:', adminError)
      return NextResponse.json(
        { error: 'Admin introuvable' },
        { status: 404 }
      )
    }

    const profileId = adminData.profile_id

    // 3. Supprimer la liaison agency_admin (CASCADE supprimera les invitations liées)
    const { error: deleteError } = await supabaseAdmin
      .from('agency_admins')
      .delete()
      .eq('id', adminId)

    if (deleteError) {
      console.error('Erreur suppression liaison:', deleteError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    // 4. Supprimer l'utilisateur de Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profileId)

    if (authDeleteError) {
      console.error('Erreur suppression auth user:', authDeleteError)
      // On continue quand même car la liaison est déjà supprimée
    }

    console.log(`✅ Admin supprimé: ${adminId} (profile: ${profileId})`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur API /api/admins/delete:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
