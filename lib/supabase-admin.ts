import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con SERVICE_ROLE_KEY.
 *
 * Bypassea completamente las Row Level Security policies.
 * Solo debe usarse en rutas API del servidor (app/api/*), nunca en componentes cliente.
 * Importar este singleton en lugar de llamar a createClient directamente.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
