import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUsuarioId(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id ?? null
}

export async function GET(request: NextRequest) {
  try {
    const usuarioId = await getUsuarioId(request)
    if (!usuarioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const prospectoId = new URL(request.url).searchParams.get('prospecto_id')
    if (!prospectoId) return NextResponse.json({ error: 'prospecto_id requerido' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('prospecto_timeline')
      .select('*, usuarios(nombres, nombre_negocio)')
      .eq('prospecto_id', prospectoId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ timeline: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
