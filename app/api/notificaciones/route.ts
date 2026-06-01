import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUsuarioId(request: Request): Promise<number | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.id ?? null
}

export async function GET(request: NextRequest) {
  try {
    const usuarioId = await getUsuarioId(request)
    if (!usuarioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ notificaciones: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuarioId = await getUsuarioId(request)
    if (!usuarioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await request.json()

    // Si se pasa id → marca solo esa; si no → marca todas
    let q = supabaseAdmin
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', usuarioId)

    if (id) q = q.eq('id', id)

    const { error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
