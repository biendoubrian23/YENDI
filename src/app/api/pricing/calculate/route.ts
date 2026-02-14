import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/pricing/calculate
 * Body: { trip_id, user_id?, device_id? }
 * Calcule le prix dynamique pour un trajet donné
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trip_id, user_id, device_id } = body

    if (!trip_id) {
      return NextResponse.json({ error: 'trip_id is required' }, { status: 400 })
    }

    // Appeler la fonction SQL calculate_dynamic_price
    const { data, error } = await supabaseAdmin.rpc('calculate_dynamic_price', {
      p_trip_id: trip_id,
      p_user_id: user_id || null,
      p_device_id: device_id || null,
    })

    if (error) {
      console.error('Pricing calculation error:', error)
      return NextResponse.json({ error: 'Failed to calculate price' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Pricing API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/pricing/calculate?trip_ids=id1,id2,id3&user_id=xxx&device_id=yyy
 * Calcule les prix dynamiques pour plusieurs trajets en batch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripIdsParam = searchParams.get('trip_ids')
    const userId = searchParams.get('user_id')
    const deviceId = searchParams.get('device_id')

    if (!tripIdsParam) {
      return NextResponse.json({ error: 'trip_ids is required' }, { status: 400 })
    }

    const tripIds = tripIdsParam.split(',').filter(Boolean)

    // Calculate price for each trip in parallel
    const results = await Promise.all(
      tripIds.map(async (tripId) => {
        const { data, error } = await supabaseAdmin.rpc('calculate_dynamic_price', {
          p_trip_id: tripId,
          p_user_id: userId || null,
          p_device_id: deviceId || null,
        })

        if (error) {
          return { trip_id: tripId, error: error.message }
        }

        return { trip_id: tripId, ...data }
      })
    )

    return NextResponse.json({ prices: results })
  } catch (err) {
    console.error('Batch pricing API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
