import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET → listar todos los abogados
export async function GET(request: Request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  try {
    const { data, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbError) return NextResponse.json({ abogados: null, error: dbError.message }, { status: 400 })
    return NextResponse.json({ abogados: data })
  } catch {
    return NextResponse.json({ abogados: null, error: 'Error interno' }, { status: 500 })
  }
}

// POST → crear abogado
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { email, password, nombres, apellido_paterno, apellido_materno, rut, dv, nombre_usuario, telefono, is_admin } = await request.json()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    const nombreCompleto = [nombres, apellido_paterno, apellido_materno].filter(Boolean).join(' ')

    const { data: abogado, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        email,
        nombres: nombres || null,
        apellido_paterno: apellido_paterno || null,
        apellido_materno: apellido_materno || null,
        rut: rut || null,
        dv: dv || null,
        nombre_usuario: nombre_usuario || null,
        nombre: nombreCompleto || null,
        nombre_negocio: nombreCompleto || '',
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
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id, auth_user_id, email, nombres, apellido_paterno, apellido_materno, rut, dv, nombre_usuario, telefono, is_admin, estado } = await request.json()

    if (email && auth_user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { email })
      if (authError) return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    const nombreCompleto = [nombres, apellido_paterno, apellido_materno].filter(Boolean).join(' ')

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update({
        nombres: nombres || null,
        apellido_paterno: apellido_paterno || null,
        apellido_materno: apellido_materno || null,
        rut: rut || null,
        dv: dv || null,
        nombre_usuario: nombre_usuario || null,
        nombre: nombreCompleto || null,
        nombre_negocio: nombreCompleto || '',
        telefono: telefono || null,
        is_admin,
        estado,
        ...(email && { email }),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, abogado: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// PATCH → toggle estado o cambiar contraseña
export async function PATCH(request: NextRequest) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id, auth_user_id, action, estado, password } = await request.json()

    if (action === 'cambiar-password' && (!password || password.length < 8)) {
      return NextResponse.json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    if (action === 'toggle-estado') {
      await supabaseAdmin.from('usuarios').update({ estado }).eq('id', id)
      await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
        ban_duration: estado ? 'none' : '876000h',
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'cambiar-password') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password })
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → eliminar abogado
export async function DELETE(request: NextRequest) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id, auth_user_id } = await request.json()

    await supabaseAdmin.from('usuarios').delete().eq('id', id)
    await supabaseAdmin.auth.admin.deleteUser(auth_user_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
