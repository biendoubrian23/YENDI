import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      adminId,
      firstName,
      lastName,
      email,
      phone,
      agencyId,
      role,
    } = body

    // Validation
    if (!adminId || !firstName || !lastName || !email || !agencyId || !role) {
      return NextResponse.json(
        { error: 'Informations manquantes' },
        { status: 400 }
      )
    }

    const fullName = `${firstName} ${lastName}`

    // 1. Récupérer l'admin pour obtenir le profile_id
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('agency_admins')
      .select('profile_id, agency_id')
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
    const oldAgencyId = adminData.agency_id

    // 2. Mettre à jour le profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        email,
        phone: phone || null,
      })
      .eq('id', profileId)

    if (profileError) {
      console.error('Erreur mise à jour profil:', profileError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      )
    }

    // 3. Mettre à jour l'email dans Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      profileId,
      {
        email,
        user_metadata: {
          full_name: fullName,
          phone: phone || null,
        },
      }
    )

    if (authError) {
      console.error('Erreur mise à jour auth:', authError)
      // On continue même si ça échoue car le profil est déjà mis à jour
    }

    // 4. Mettre à jour la liaison agency_admin (rôle et agence)
    const { error: linkError } = await supabaseAdmin
      .from('agency_admins')
      .update({
        role,
        agency_id: agencyId,
      })
      .eq('id', adminId)

    if (linkError) {
      console.error('Erreur mise à jour liaison:', linkError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la liaison agence' },
        { status: 500 }
      )
    }

    // 5. Si l'agence a changé, mettre à jour l'invitation
    if (oldAgencyId !== agencyId) {
      await supabaseAdmin
        .from('invitations')
        .update({ agency_id: agencyId })
        .eq('email', email)
        .eq('agency_id', oldAgencyId)
    }

    console.log(`✅ Admin mis à jour: ${adminId}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur API /api/admins/update:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
