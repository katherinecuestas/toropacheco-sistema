import { supabase } from './supabase'

/**
 * Headers con el access token de la sesión actual, para llamar a rutas `/api/*` protegidas.
 * Se lee en cada llamada: `getSession()` refresca el token si expiró, a diferencia de un token
 * guardado en estado al cargar la página.
 *
 * @param opts.json - Incluir `Content-Type: application/json` (default `true`).
 *   Usar `false` al enviar `FormData`, para que el navegador ponga el boundary multipart.
 *
 * @example fetch('/api/citas', { headers: await authHeaders() })
 */
export async function authHeaders(opts: { json?: boolean } = {}): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    ...(opts.json === false ? {} : { 'Content-Type': 'application/json' }),
    ...(session ? { authorization: `Bearer ${session.access_token}` } : {}),
  }
}
