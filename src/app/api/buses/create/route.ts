import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      agency_id,
      brand,
      model,
      number,
      plate,
      seats,
      seat_layout,
      features,
      fuel_level,
      mileage,
      last_revision,
      next_revision,
      is_vip,
    } = body

    // Validation
    if (!agency_id || !brand || !model || !plate || !seats) {
      return NextResponse.json(
        { error: 'Champs obligatoires : agency_id, brand, model, plate, seats' },
        { status: 400 }
      )
    }

    // Vérifier que la plaque n'existe pas déjà pour cette agence
    const { data: existing } = await supabaseAdmin
      .from('buses')
      .select('id')
      .eq('agency_id', agency_id)
      .eq('plate', plate)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Un bus avec cette immatriculation existe déjà' },
        { status: 400 }
      )
    }

    const { data: bus, error } = await supabaseAdmin
      .from('buses')
      .insert({
        agency_id,
        brand,
        model,
        number: number || 'N/A',
        plate,
        seats: parseInt(seats),
        seat_layout: seat_layout || { left: 2, right: 2, back_row: 5, rows: 12 },
        features: features || [],
        fuel_level: fuel_level ?? 100,
        mileage: mileage ?? 0,
        last_revision: last_revision || null,
        next_revision: next_revision || null,
        is_vip: is_vip ?? false,
        status: 'disponible',
      })
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
