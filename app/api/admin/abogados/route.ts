import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST → crear abogado
export async function POST(request: NextRequest) {
  try {
    const { email, password, nombre_negocio, telefono, is_admin } = await request.json()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    const { data: abogado, error: dbError } = await supabaseAdmin
      .from('abogados')
      .insert({
        auth_user_id: authData.user.id,
        email,
        nombre_negocio,
        telefono: telefono || null,
        is_admin: is_admin ?? false,
        estado: true,
      })
      .select()
      .single()

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ success: false, error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, abogado })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// PUT → editar abogado
export async function PUT(request: NextRequest) {
  try {
    const { id, auth_user_id, email, nombre_negocio, telefono, is_admin, estado } = await request.json()

    // Actualizar email en Auth si cambió
    if (email && auth_user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { email })
      if (authError) return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('abogados')
      .update({ nombre_negocio, telefono: telefono || null, is_admin, estado, ...(email && { email }) })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, abogado: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → eliminar abogado
export async function DELETE(request: NextRequest) {
  try {
    const { id, auth_user_id } = await request.json()

    await supabaseAdmin.from('abogados').delete().eq('id', id)
    await supabaseAdmin.auth.admin.deleteUser(auth_user_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
