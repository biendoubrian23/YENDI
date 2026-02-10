import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      agencyId,
      role = 'manager',
    } = body

    // Validation
    if (!firstName || !lastName || !email || !agencyId) {
      return NextResponse.json(
        { error: 'Informations manquantes' },
        { status: 400 }
      )
    }

    const fullName = `${firstName} ${lastName}`

    // Générer le mot de passe provisoire
    const randomNum = Math.floor(Math.random() * 900) + 100
    const tempPassword = `Yendi-${randomNum}-2026`

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
        phone: phone || null,
      },
    })

    if (authError || !authData.user) {
      console.error('Erreur création utilisateur:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Erreur lors de la création de l\'utilisateur' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Créer la liaison agency_admin
    const { error: linkError } = await supabaseAdmin
      .from('agency_admins')
      .insert({
        agency_id: agencyId,
        profile_id: userId,
        role,
      })

    if (linkError) {
      console.error('Erreur liaison admin-agence:', linkError)
      // Rollback: supprimer l'utilisateur créé
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Erreur lors de la liaison admin-agence' },
        { status: 500 }
      )
    }

    // 3. Enregistrer l'invitation avec le temp_password et phone
    const { error: invError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        agency_id: agencyId,
        temp_password: tempPassword,
        phone: phone || null,
      })

    if (invError) {
      console.error('Erreur enregistrement invitation:', invError)
    }

    // 4. Logger l'action (optionnel)
    console.log(`✅ Admin créé: ${email} pour agence ${agencyId}`)

    return NextResponse.json({
      success: true,
      userId,
      tempPassword,
      email,
      fullName,
    })
  } catch (err) {
    console.error('Erreur API /api/admins/create:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
