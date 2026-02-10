import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id du bus requis' }, { status: 400 })
    }

    // Nettoyer les champs : ne garder que ceux autorisés
    const allowed = [
      'brand', 'model', 'number', 'plate', 'seats', 'seat_layout',
      'status', 'fuel_level', 'mileage', 'features',
      'current_driver', 'current_line', 'last_revision', 'next_revision', 'is_vip',
    ]
    const cleanUpdates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key]
      }
    }

    if (cleanUpdates.seats) {
      cleanUpdates.seats = parseInt(String(cleanUpdates.seats))
    }
    if (cleanUpdates.fuel_level !== undefined) {
      cleanUpdates.fuel_level = parseInt(String(cleanUpdates.fuel_level))
    }
    if (cleanUpdates.mileage !== undefined) {
      cleanUpdates.mileage = parseInt(String(cleanUpdates.mileage))
    }

    const { data: bus, error } = await supabaseAdmin
      .from('buses')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bus })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
