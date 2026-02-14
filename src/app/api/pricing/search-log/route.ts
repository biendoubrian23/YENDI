import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/pricing/search-log
 * Body: { user_id?, device_id?, trip_id?, route_key }
 * Log une recherche utilisateur pour le FOMO personnalisé
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, device_id, trip_id, route_key } = body

    if (!route_key) {
      return NextResponse.json({ error: 'route_key is required' }, { status: 400 })
    }

    // Check if there's already a log for this user/device + route
    const matchFilter: any = { route_key }
    if (user_id) matchFilter.user_id = user_id
    else if (device_id) matchFilter.device_id = device_id
    else {
      // No user or device ID, just insert
      await supabaseAdmin.from('user_search_log').insert({
        user_id: null,
        device_id: null,
        trip_id: trip_id || null,
        route_key,
      })
      return NextResponse.json({ search_count: 1 })
    }

    // Look for existing entry
    const { data: existing } = await supabaseAdmin
      .from('user_search_log')
      .select('id, search_count')
      .match(matchFilter)
      .single()

    if (existing) {
      // Increment search count
      const newCount = existing.search_count + 1
      await supabaseAdmin
        .from('user_search_log')
        .update({
          search_count: newCount,
          last_searched_at: new Date().toISOString(),
          trip_id: trip_id || null,
        })
        .eq('id', existing.id)

      return NextResponse.json({ search_count: newCount })
    } else {
      // Create new entry
      await supabaseAdmin.from('user_search_log').insert({
        user_id: user_id || null,
        device_id: device_id || null,
        trip_id: trip_id || null,
        route_key,
      })
      return NextResponse.json({ search_count: 1 })
    }
  } catch (err) {
    console.error('Search log API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
