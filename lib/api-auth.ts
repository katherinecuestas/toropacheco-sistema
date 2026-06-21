import { NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

/**
 * Perfil mínimo de usuario devuelto por los guards de autenticación.
 * Corresponde a una fila de la tabla `usuarios`.
 */
export type UsuarioRow = {
  id: number
  rol: string
  is_admin: boolean
  nombres: string | null
  nombre_negocio: string | null
}

/**
 * Extrae y valida el Bearer token del header `Authorization`,
 * lo verifica con Supabase Auth y devuelve el perfil del usuario de la tabla `usuarios`.
 * Devuelve `null` si el token falta, es inválido o el usuario no existe en la tabla.
 */
async function resolveUsuario(request: Request): Promise<UsuarioRow | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null

  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id, rol, is_admin, nombres, nombre_negocio')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return data ?? null
}

/**
 * Guard: cualquier usuario autenticado con token válido.
 * Devuelve `{ usuario, error: null }` o `{ usuario: null, error: Response 401 }`.
 */
export async function requireAuth(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario) {
    return { usuario: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  return { usuario, error: null }
}

/**
 * Guard: solo usuarios con `is_admin === true`.
 * Devuelve `{ usuario, error: null }` o `{ usuario: null, error: Response 403 }`.
 */
export async function requireAdmin(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario || !usuario.is_admin) {
    return { usuario: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { usuario, error: null }
}

/**
 * Guard: solo usuarios con `rol === 'supervisor'`.
 * Devuelve `{ usuario, error: null }` o `{ usuario: null, error: Response 403 }`.
 */
export async function requireSupervisor(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario || usuario.rol !== 'supervisor') {
    return { usuario: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { usuario, error: null }
}

/**
 * Guard: solo usuarios con `rol === 'abogado'`.
 * Devuelve `{ usuario, error: null }` o `{ usuario: null, error: Response 403 }`.
 */
export async function requireAbogado(request: Request) {
  const usuario = await resolveUsuario(request)
  if (!usuario || usuario.rol !== 'abogado') {
    return { usuario: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { usuario, error: null }
}
