import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAbogadoId(request: Request): Promise<number | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data || data.rol === 'supervisor') return null
  return data.id
}

export async function GET(request: NextRequest) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('prospectos')
      .select('*, tipificaciones(id)')
      .in('estado', ['interesado', 'agendado'])
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ prospectos: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const formatFecha = (f: string | null | undefined) => f ? f.slice(0, 10) : null

export async function POST(request: NextRequest) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { nombre, rut, telefono, email, requerimiento, fecha_requerimiento,
            juzgado, monto_deuda, estado, observacion, fecha_llamar, plazo_fatal } = body

    const { data, error } = await supabaseAdmin
      .from('prospectos')
      .insert({
        creado_por: abogadoId,
        nombre: nombre || null,
        rut: rut || null,
        telefono: telefono || null,
        email: email || null,
        requerimiento: requerimiento || null,
        fecha_requerimiento: formatFecha(fecha_requerimiento),
        juzgado: juzgado || null,
        monto_deuda: monto_deuda ? Number(monto_deuda) : null,
        estado: estado || 'sin_contacto',
        observacion: observacion || null,
        fecha_llamar: formatFecha(fecha_llamar),
        plazo_fatal: formatFecha(plazo_fatal),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data: u } = await supabaseAdmin
      .from('usuarios').select('nombres, nombre_negocio').eq('id', abogadoId).maybeSingle()
    const nombreU = u?.nombres?.split(' ')[0] ?? u?.nombre_negocio?.split(' ')[0] ?? 'Abogado'

    await supabaseAdmin.from('prospecto_timeline').insert({
      prospecto_id: data.id,
      usuario_id: abogadoId,
      evento: 'creado',
      descripcion: `Prospecto creado por ${nombreU}`,
    })

    return NextResponse.json({ success: true, prospecto: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const abogadoId = await getAbogadoId(request)
    if (!abogadoId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await request.json()
    const { error } = await supabaseAdmin
      .from('prospectos')
      .update({ revisado: true })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
