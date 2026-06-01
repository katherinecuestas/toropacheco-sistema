import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSupervisorId(request: Request): Promise<number | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data || data.rol !== 'supervisor') return null
  return data.id
}

export async function GET(request: NextRequest) {
  try {
    const supervisorId = await getSupervisorId(request)
    if (!supervisorId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const now = new Date()
    const mes = now.getMonth() + 1
    const anio = now.getFullYear()

    const { data, error } = await supabaseAdmin
      .from('ventas')
      .select('*, prospectos(nombre, juzgado, monto_deuda, created_at)')
      .eq('supervisor_id', supervisorId)
      .eq('mes', mes)
      .eq('anio', anio)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const ventas = data ?? []

    // Desglose por región
    const porRegion: Record<string, number> = {}
    for (const v of ventas) {
      const r = v.region ?? '—'
      porRegion[r] = (porRegion[r] ?? 0) + 1
    }

    return NextResponse.json({ ventas, total: ventas.length, porRegion, mes, anio })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
