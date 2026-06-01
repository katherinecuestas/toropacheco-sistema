import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const TIPO_LABEL: Record<string, string> = {
  contesto_interesado:     '✅ Contestó — Interesado',
  contesto_agendado:       '📅 Contestó — Agendado',
  contesto_lo_va_pensar:   '🤔 Contestó — Lo va a pensar',
  contesto_no_interesa:    '❌ Contestó — No le interesa',
  no_contesto:             '📵 No contestó',
  wsp_enviado:             '💬 WhatsApp enviado',
  ya_tiene_abogado:        '⚖️ Ya tiene abogado',
  otro:                    '📝 Otro',
}

async function getUsuarioInfo(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombres, nombre_negocio, rol')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!data) return null
  const nombre = data.nombres?.split(' ')[0] ?? data.nombre_negocio?.split(' ')[0] ?? 'Usuario'
  return { id: data.id as number, nombre, rol: data.rol as string }
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioInfo(request)
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const prospectoId = new URL(request.url).searchParams.get('prospecto_id')
    if (!prospectoId) return NextResponse.json({ error: 'prospecto_id requerido' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('tipificaciones')
      .select('*, usuarios(nombres, nombre_negocio)')
      .eq('prospecto_id', prospectoId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ tipificaciones: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioInfo(request)
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { prospecto_id, tipo, nota } = await request.json()

    const { data: tip, error: tipError } = await supabaseAdmin
      .from('tipificaciones')
      .insert({
        prospecto_id,
        usuario_id: usuario.id,
        tipo,
        nota: tipo === 'otro' ? (nota ?? null) : null,
      })
      .select()
      .single()

    if (tipError) return NextResponse.json({ error: tipError.message }, { status: 400 })

    // Evento en timeline
    const label = TIPO_LABEL[tipo] ?? tipo
    const descripcion = tipo === 'otro' && nota
      ? `${usuario.nombre} tipificó: ${label} — "${nota}"`
      : `${usuario.nombre} tipificó: ${label}`

    await supabaseAdmin.from('prospecto_timeline').insert({
      prospecto_id,
      usuario_id: usuario.id,
      evento: 'tipificacion',
      descripcion,
    })

    // Notificar al supervisor dueño si quien tipifica es un abogado
    if (usuario.rol !== 'supervisor') {
      const { data: prospecto } = await supabaseAdmin
        .from('prospectos')
        .select('creado_por, nombre')
        .eq('id', prospecto_id)
        .maybeSingle()

      if (prospecto?.creado_por) {
        await supabaseAdmin.from('notificaciones').insert({
          usuario_id: prospecto.creado_por,
          tipo: 'tipificacion',
          titulo: `Tipificación de ${prospecto.nombre}`,
          mensaje: descripcion,
          leida: false,
        })
      }
    }

    return NextResponse.json({ success: true, tipificacion: tip })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
