import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

/**
 * Vérifie que l'utilisateur est un superadmin
 */
async function verifySuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return false

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'superadmin'
}

/**
 * GET /api/pricing/config?agency_id=xxx
 * Récupère la config pricing d'une agence (auto-crée si inexistante)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agencyId = searchParams.get('agency_id')

    if (!agencyId) {
      return NextResponse.json({ error: 'agency_id is required' }, { status: 400 })
    }

    // Try to get existing config
    let { data } = await supabaseAdmin
      .from('pricing_config')
      .select('*')
      .eq('agency_id', agencyId)
      .single()

    if (!data) {
      // Auto-create with defaults
      const { data: newConfig } = await supabaseAdmin
        .from('pricing_config')
        .insert({ agency_id: agencyId })
        .select()
        .single()
      data = newConfig
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Pricing config GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/pricing/config
 * Body: { config_id, updates: { field: value, ... } }
 * Met à jour la config pricing
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { config_id, updates } = body

    if (!config_id || !updates) {
      return NextResponse.json({ error: 'config_id and updates are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('pricing_config')
      .update(updates)
      .eq('id', config_id)
      .select()
      .single()

    if (error) {
      console.error('Pricing config update error:', error)
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Pricing config PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/pricing/config/stats
 * Retourne le nombre d'agences avec yield activé
 */
export async function POST(request: NextRequest) {
  try {
    const { count } = await supabaseAdmin
      .from('pricing_config')
      .select('*', { count: 'exact', head: true })
      .eq('is_enabled', true)

    return NextResponse.json({ enabledCount: count || 0 })
  } catch (err) {
    console.error('Pricing config stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
