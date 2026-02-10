import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
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

    // Vérifier que l'utilisateur est proprietaire de l'agence
    const { data: currentAdmin } = await supabaseAdmin
      .from('agency_admins')
      .select('agency_id, role')
      .eq('profile_id', user.id)
      .single()

    if (!currentAdmin || currentAdmin.role !== 'proprietaire') {
      return NextResponse.json({ error: 'Seul le propriétaire peut ajouter des membres' }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, role } = body

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json({ error: 'Informations manquantes' }, { status: 400 })
    }

    if (!['manager', 'operateur', 'visiteur'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    // Vérifier si l'email existe déjà dans l'agence
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      // Vérifier s'il est déjà dans cette agence
      const { data: existingLink } = await supabaseAdmin
        .from('agency_admins')
        .select('id')
        .eq('agency_id', currentAdmin.agency_id)
        .eq('profile_id', existingProfile.id)
        .single()

      if (existingLink) {
        return NextResponse.json({ error: 'Ce membre existe déjà dans votre équipe' }, { status: 409 })
      }
    }

    const fullName = `${firstName} ${lastName}`

    // Générer le mot de passe provisoire
    const randomNum = Math.floor(Math.random() * 900) + 100
    const tempPassword = `Yendi-${randomNum}-2026`

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
        phone: phone || null,
      },
    })

    if (createError || !authData.user) {
      console.error('Erreur création utilisateur:', createError)
      
      // Si l'utilisateur existe déjà dans auth mais pas dans notre agence
      if (createError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec cet email' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: createError?.message || 'Erreur lors de la création' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Créer la liaison agency_admin avec le rôle choisi
    const { error: linkError } = await supabaseAdmin
      .from('agency_admins')
      .insert({
        agency_id: currentAdmin.agency_id,
        profile_id: userId,
        role,
        is_primary: false,
      })

    if (linkError) {
      console.error('Erreur liaison membre-agence:', linkError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erreur lors de la liaison' }, { status: 500 })
    }

    // 3. Enregistrer dans invitations pour traçabilité
    const { error: invError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        full_name: fullName,
        agency_id: currentAdmin.agency_id,
        role,
        temp_password: tempPassword,
        phone: phone || null,
      })

    if (invError) {
      console.error('Erreur enregistrement invitation:', invError)
    }

    console.log(`✅ Membre créé: ${email} (${role}) pour agence ${currentAdmin.agency_id}`)

    return NextResponse.json({
      success: true,
      userId,
      tempPassword,
      email,
      fullName,
      role,
    })
  } catch (err) {
    console.error('Erreur API /api/team/create:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
