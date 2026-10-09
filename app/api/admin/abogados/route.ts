import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Da o quita acceso de administrador. La única fuente de verdad es la tabla `admins`;
 * la columna `usuarios.is_admin` ya no se lee ni se escribe.
 */
async function sincronizarAdmin(authUserId: string, esAdmin: boolean) {
  const { data: existente } = await supabaseAdmin
    .from('admins').select('id').eq('auth_user_id', authUserId).maybeSingle()
  if (esAdmin && !existente) {
    const { error } = await supabaseAdmin.from('admins').insert({ auth_user_id: authUserId })
    return !error
  }
  if (!esAdmin && existente) {
    const { error } = await supabaseAdmin.from('admins').delete().eq('auth_user_id', authUserId)
    return !error
  }
  return true
}

/** Roles que se pueden asignar al crear un usuario interno desde /admin */
const ROLES_VALIDOS = ['abogado', 'supervisor'] as const

// GET → listar todos los abogados
export async function GET(request: Request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  try {
    const { data, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('[admin/abogados GET] Error listando usuarios:', dbError)
      return NextResponse.json({ abogados: null, error: 'No se pudo obtener la lista de usuarios.' }, { status: 500 })
    }

    // es_admin se calcula desde la tabla admins; la columna usuarios.is_admin no se expone
    const { data: admins } = await supabaseAdmin.from('admins').select('auth_user_id')
    const idsAdmin = new Set((admins ?? []).map((a: { auth_user_id: string }) => a.auth_user_id))
    const abogados = (data ?? []).map((fila: Record<string, unknown>) => {
      const u: Record<string, unknown> = { ...fila, es_admin: idsAdmin.has(fila.auth_user_id as string) }
      delete u.is_admin
      return u
    })
    return NextResponse.json({ abogados })
  } catch {
    return NextResponse.json({ abogados: null, error: 'Error interno' }, { status: 500 })
  }
}

/**
 * Mensaje para el admin cuando Supabase Auth rechaza una operación sobre la cuenta.
 * No se reenvía `error.message`: se traducen los casos conocidos y el resto usa `porDefecto`.
 */
function mensajeErrorAuth(error: { code?: string; message?: string }, porDefecto = 'No se pudo crear la cuenta.') {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return 'Ya existe una cuenta con ese email.'
  if (error.code === 'weak_password') return 'La contraseña no cumple los requisitos mínimos.'
  return porDefecto
}

/** Texto no vacío (sin espacios a los extremos) o `null`. */
function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Valor de `usuarios.nombre_negocio` (NOT NULL): el que venga en el body, o el nombre
 * completo (nombres + apellidos), o el email. Devuelve `null` solo si no hay ninguno.
 */
function nombreNegocio(d: { nombre_negocio?: unknown; nombres?: unknown; apellido_paterno?: unknown; apellido_materno?: unknown; email?: unknown }) {
  const nombreCompleto = [d.nombres, d.apellido_paterno, d.apellido_materno].map(texto).filter(Boolean).join(' ')
  return texto(d.nombre_negocio) ?? (nombreCompleto || null) ?? texto(d.email)
}

// POST → crear abogado o supervisor (rol: 'abogado' por defecto)
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  // Cuenta de Auth creada en esta request: si algo falla después, se borra
  let authUserIdCreado: string | null = null
  const deshacerCuentaAuth = async () => {
    if (!authUserIdCreado) return
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserIdCreado)
    if (error) console.error('[admin/abogados POST] No se pudo borrar la cuenta Auth huérfana:', authUserIdCreado, error)
  }

  try {
    const body = await request.json()
    const { email, password, nombres, apellido_paterno, apellido_materno, rut, dv, nombre_usuario, telefono, es_admin, rol } = body

    // Se valida antes de crear la cuenta en Auth, para no dejar usuarios huérfanos
    const rolFinal = rol ?? 'abogado'
    if (!ROLES_VALIDOS.includes(rolFinal)) {
      return NextResponse.json({ success: false, error: "Rol inválido: debe ser 'abogado' o 'supervisor'" }, { status: 400 })
    }

    const { data: authData, error: errorAuth } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (errorAuth || !authData?.user) {
      console.error('[admin/abogados POST] Error creando la cuenta en Auth:', errorAuth)
      return NextResponse.json({ success: false, error: mensajeErrorAuth(errorAuth ?? {}) }, { status: 400 })
    }
    authUserIdCreado = authData.user.id

    // Solo campos permitidos: cualquier otro campo del body (is_admin, id, nombre, etc.) se ignora
    const filaUsuario = {
      nombres: nombres || null,
      apellido_paterno: apellido_paterno || null,
      apellido_materno: apellido_materno || null,
      rut: rut || null,
      dv: dv || null,
      nombre_usuario: nombre_usuario || null,
      email,
      telefono: telefono || null,
      // NOT NULL: body, nombre completo o email (el email existe: Auth ya lo aceptó)
      nombre_negocio: nombreNegocio(body) ?? String(email),
      // Calculados por la ruta
      auth_user_id: authUserIdCreado,
      rol: rolFinal,
      estado: true,
    }

    const { data: abogado, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert(filaUsuario)
      .select()
      .single()

    if (dbError) {
      console.error('[admin/abogados POST] Error insertando en usuarios:', dbError)
      await deshacerCuentaAuth()
      return NextResponse.json({ success: false, error: 'No se pudo crear el usuario.' }, { status: 500 })
    }

    if (es_admin === true && !(await sincronizarAdmin(authUserIdCreado, true))) {
      console.error('[admin/abogados POST] Error dando acceso de administrador a', authUserIdCreado)
      await supabaseAdmin.from('usuarios').delete().eq('id', abogado.id)
      await deshacerCuentaAuth()
      return NextResponse.json({ success: false, error: 'No se pudo dar acceso de administrador' }, { status: 500 })
    }

    return NextResponse.json({ success: true, abogado: { ...abogado, es_admin: es_admin === true } })
  } catch (err) {
    console.error('[admin/abogados POST] Error inesperado:', err)
    await deshacerCuentaAuth()
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// PUT → editar abogado
export async function PUT(request: NextRequest) {
  const { admin, error: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, auth_user_id, email, nombres, apellido_paterno, apellido_materno, rut, dv, nombre_usuario, telefono, es_admin, estado } = body

    // Evita que un admin se quite su propio acceso y quede fuera del panel
    if (es_admin === false && auth_user_id === admin!.auth_user_id) {
      return NextResponse.json({ success: false, error: 'No puedes quitarte tu propio acceso de administrador' }, { status: 400 })
    }

    if (email && auth_user_id) {
      const { error: errorAuth } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { email })
      if (errorAuth) {
        console.error('[admin/abogados PUT] Error actualizando el email en Auth:', errorAuth)
        return NextResponse.json({ success: false, error: mensajeErrorAuth(errorAuth, 'No se pudo actualizar el email.') }, { status: 400 })
      }
    }

    // Solo columnas que existen en public.usuarios; las NOT NULL nunca se envían vacías
    // (si no hay valor válido, la columna no se toca y conserva el actual)
    const negocio = nombreNegocio(body)
    const cambios: Record<string, unknown> = {
      nombres: nombres || null,
      apellido_paterno: apellido_paterno || null,
      apellido_materno: apellido_materno || null,
      rut: rut || null,
      dv: dv || null,
      nombre_usuario: nombre_usuario || null,
      telefono: telefono || null,
      ...(negocio && { nombre_negocio: negocio }),
      ...(typeof estado === 'boolean' && { estado }),
      ...(texto(email) && { email: texto(email) }),
    }

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update(cambios)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/abogados PUT] Error actualizando usuarios:', error)
      return NextResponse.json({ success: false, error: 'No se pudo actualizar el usuario.' }, { status: 500 })
    }

    if (typeof es_admin === 'boolean' && auth_user_id && !(await sincronizarAdmin(auth_user_id, es_admin))) {
      return NextResponse.json({ success: false, error: 'No se pudo actualizar el acceso de administrador' }, { status: 500 })
    }

    return NextResponse.json({ success: true, abogado: { ...data, es_admin } })
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
      if (error) {
        console.error('[admin/abogados PATCH] Error cambiando la contraseña:', error)
        return NextResponse.json({ success: false, error: mensajeErrorAuth(error, 'No se pudo cambiar la contraseña.') }, { status: 400 })
      }
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
