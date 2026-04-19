import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, password, telefono, rut } = await request.json()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ success: false, error: authError.message }, { status: 400 })

    const { error: clienteError } = await supabaseAdmin.from('clientes').insert({
      auth_user_id: authData.user.id,
      nombre,
      email,
      telefono: telefono || null,
      rut: rut || null,
    })

    if (clienteError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ success: false, error: clienteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
