import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PUT - Modifier le rôle ou le statut d'un membre
export async function PUT(request: Request) {
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

    const body = await request.json()
    const { memberId, newRole, newStatus } = body

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

    // Interdire de modifier le propriétaire principal
    if (member.is_primary && member.role === 'proprietaire') {
      return NextResponse.json({ error: 'Impossible de modifier le propriétaire principal' }, { status: 403 })
    }

    // Mise à jour du rôle dans agency_admins
    if (newRole && ['manager', 'operateur', 'visiteur'].includes(newRole)) {
      const { error: roleError } = await supabaseAdmin
        .from('agency_admins')
        .update({ role: newRole })
        .eq('id', memberId)

      if (roleError) {
        console.error('Erreur mise à jour rôle:', roleError)
        return NextResponse.json({ error: 'Erreur mise à jour du rôle' }, { status: 500 })
      }
    }

    // Mise à jour du statut dans profiles
    if (newStatus && ['actif', 'suspendu'].includes(newStatus)) {
      const { error: statusError } = await supabaseAdmin
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', member.profile_id)

      if (statusError) {
        console.error('Erreur mise à jour statut:', statusError)
        return NextResponse.json({ error: 'Erreur mise à jour du statut' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur API /api/team/update:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
