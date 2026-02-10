import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - Lister les membres de l'équipe de l'agence
export async function GET(request: Request) {
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

    // Trouver l'agence et le rôle de l'utilisateur connecté
    const { data: currentAdmin } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!currentAdmin) {
      return NextResponse.json({ error: 'Admin non trouvé' }, { status: 403 })
    }

    // Seuls les proprietaires peuvent voir la page équipe
    if (currentAdmin.role !== 'proprietaire') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer tous les membres de l'agence avec leurs profils
    const { data: members, error: membersError } = await supabaseAdmin
      .from('agency_admins')
      .select(`
        id,
        role,
        is_primary,
        created_at,
        profiles (
          id,
          full_name,
          email,
          phone,
          status,
          last_login_at
        )
      `)
      .eq('agency_id', currentAdmin.agency_id)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Erreur récupération membres:', membersError)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Formater la réponse
    const formatted = (members || []).map(m => {
      const profile = m.profiles as unknown as {
        id: string
        full_name: string
        email: string
        phone: string | null
        status: string
        last_login_at: string | null
      }
      return {
        id: m.id,
        profile_id: profile?.id,
        name: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        role: m.role,
        is_primary: m.is_primary,
        status: profile?.status || 'en_attente',
        last_login_at: profile?.last_login_at || null,
        created_at: m.created_at,
      }
    })

    return NextResponse.json({ members: formatted, agencyId: currentAdmin.agency_id })
  } catch (err) {
    console.error('Erreur API /api/team/list:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
