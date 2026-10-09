import { NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

/**
 * Perfil mínimo de usuario devuelto por los guards de autenticación.
 * Corresponde a una fila de la tabla `usuarios`.
 */
export type UsuarioRow = {
  id: number
  rol: string
  nombres: string | null
  nombre_negocio: string | null
}

/**
 * Extrae el Bearer token del header `Authorization` y lo verifica con Supabase Auth.
 * Devuelve el `auth_user_id` (id de `auth.users`), o `null` si el token falta o es inválido.
 */
async function resolveAuthUserId(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user?.id ?? null
}

/**
 * Valida el token y devuelve el perfil del usuario de la tabla `usuarios`.
 * Devuelve `null` si el token falta, es inválido o el usuario no existe en la tabla.
 */
async function resolveUsuario(request: Request): Promise<UsuarioRow | null> {
  const authUserId = await resolveAuthUserId(request)
  if (!authUserId) return null

  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id, rol, nombres, nombre_negocio')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  return data ?? null
}

/** Respuesta de los guards cuando falta el token, es inválido o el usuario no existe en `usuarios`. */
function noAutorizado() {
  return { usuario: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
}

/** Respuesta de los guards cuando el usuario está autenticado pero su rol no corresponde. */
function accesoDenegado() {
  return { usuario: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
}

/**
 * Guard: cualquier usuario autenticado con token válido.
 * Devuelve `{ usuario, error: null }` o `{ usuario: null, error: Response 401 }`.
 */
export async function requireAuth(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario) return noAutorizado()
  return { usuario, error: null }
}

/**
 * Guard: solo administradores. La única fuente de verdad es la tabla `admins`
 * (fila con `auth_user_id` = usuario autenticado). No exige fila en `usuarios`:
 * un admin puede existir solo en `admins`.
 * Devuelve `{ admin: { auth_user_id }, error: null }`, o `error` 401 sin token válido y 403 si no es admin.
 */
export async function requireAdmin(request: Request) {
  const authUserId = await resolveAuthUserId(request)
  if (!authUserId) return { admin: null, error: noAutorizado().error }

  const { data: fila } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (!fila) return { admin: null, error: accesoDenegado().error }

  return { admin: { auth_user_id: authUserId }, error: null }
}

/**
 * Guard: solo usuarios con `rol === 'supervisor'`.
 * Devuelve `{ usuario, error: null }`, o `error` 401 sin sesión válida y 403 si no es supervisor.
 */
export async function requireSupervisor(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario) return noAutorizado()
  if (usuario.rol !== 'supervisor') return accesoDenegado()
  return { usuario, error: null }
}

/**
 * Guard: solo usuarios con `rol === 'abogado'`.
 * Devuelve `{ usuario, error: null }`, o `error` 401 sin sesión válida y 403 si no es abogado.
 */
export async function requireAbogado(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario) return noAutorizado()
  if (usuario.rol !== 'abogado') return accesoDenegado()
  return { usuario, error: null }
}
