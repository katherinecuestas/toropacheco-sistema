import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT → editar cita (fecha, notas, estado)
export async function PUT(request: NextRequest) {
  try {
    const { id, fecha_hora, notas, estado } = await request.json()
    const { data, error } = await supabaseAdmin
      .from('citas')
      .update({ fecha_hora, notas, estado })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, cita: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → cancelar cita
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    const { error } = await supabaseAdmin.from('citas').update({ estado: 'cancelada' }).eq('id', id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
