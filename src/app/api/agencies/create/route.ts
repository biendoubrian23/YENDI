import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name: agencyName,
      siret_number: siret,
      website,
      address,
      city,
      country_code: countryCode,
      color,
      plan,
      admin_first_name: adminFirstName,
      admin_last_name: adminLastName,
      admin_email: adminEmail,
      admin_phone: adminPhone,
      admin_role: adminRole,
      temp_password: tempPasswordFromForm,
    } = body

    const adminFullName = adminFirstName && adminLastName 
      ? `${adminFirstName} ${adminLastName}` 
      : adminFirstName || adminLastName || null

    // Vérifier l'auth du superadmin via le header Authorization
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que c'est un superadmin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // 1. Créer l'agence
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .insert({
        name: agencyName,
        siret_number: siret || null,
        website: website || null,
        address: address || null,
        city: city || 'Abidjan',
        country_code: countryCode || 'CI',
        color: color || '#3b82f6',
        plan: plan || 'standard',
        status: adminEmail ? 'en_attente' : 'configuration',
      })
      .select()
      .single()

    if (agencyError) {
      return NextResponse.json({ error: 'Erreur création agence', details: agencyError.message }, { status: 500 })
    }

    let invitation = null

    // 2. Si un admin est spécifié, créer l'invitation
    if (adminEmail && adminFullName) {
      const { data: inv, error: invError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: adminEmail,
          full_name: adminFullName,
          phone: adminPhone || null,
          agency_id: agency.id,
          role: adminRole || 'proprietaire',
          temp_password: tempPasswordFromForm || null,
        })
        .select()
        .single()

      if (invError) {
        return NextResponse.json({ error: 'Erreur création invitation', details: invError.message }, { status: 500 })
      }

      invitation = inv

      // 3. Créer le user auth avec le mot de passe provisoire du formulaire
      const tempPassword = tempPasswordFromForm || `Yendi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName,
          phone: adminPhone || null,
          role: 'admin',
          invitation_token: inv.token,
          agency_id: agency.id,
        },
      })

      if (signUpError) {
        // Si l'email existe déjà dans auth, on lie l'admin à l'agence ET on met à jour le mot de passe
        if (signUpError.message.includes('already')) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existingUsers?.users?.find(u => u.email === adminEmail)

          if (existingUser) {
            // Mettre à jour le mot de passe pour correspondre au nouveau mot de passe provisoire
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: tempPassword,
            })

            // Remettre le statut en_attente pour forcer le changement de mot de passe
            await supabaseAdmin
              .from('profiles')
              .update({ status: 'en_attente' })
              .eq('id', existingUser.id)

            // Lier à l'agence
            await supabaseAdmin.from('agency_admins').insert({
              agency_id: agency.id,
              profile_id: existingUser.id,
              role: adminRole || 'proprietaire',
              is_primary: true,
            })
          }
        } else {
          console.error('Erreur création user:', signUpError)
        }
      } else if (newUser?.user) {
        // Lier l'admin à l'agence
        await supabaseAdmin.from('agency_admins').insert({
          agency_id: agency.id,
          profile_id: newUser.user.id,
          role: adminRole || 'proprietaire',
          is_primary: true,
        })
      }

      // Logger l'action
      await supabaseAdmin.from('activity_logs').insert({
        user_id: user.id,
        action: 'create_agency_with_invite',
        entity_type: 'agency',
        entity_id: agency.id,
        details: {
          agency_name: agencyName,
          admin_email: adminEmail,
          invitation_id: inv.id,
        },
      })
    } else {
      // Logger l'action sans admin
      await supabaseAdmin.from('activity_logs').insert({
        user_id: user.id,
        action: 'create_agency',
        entity_type: 'agency',
        entity_id: agency.id,
        details: { agency_name: agencyName },
      })
    }

    return NextResponse.json({
      success: true,
      agency,
      invitation,
    })
  } catch (error) {
    console.error('Erreur API:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
