import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'

export const TIPO_LABEL: Record<string, string> = {
  venta:                   '💰 Venta',
  contesto_interesado:     '✅ Contestó — Interesado',
  contesto_agendado:       '📅 Contestó — Agendado',
  contesto_lo_va_pensar:   '🤔 Contestó — Lo va a pensar',
  contesto_no_interesa:    '❌ Contestó — No le interesa',
  no_contesto:             '📵 No contestó',
  wsp_enviado:             '💬 WhatsApp enviado',
  ya_tiene_abogado:        '⚖️ Ya tiene abogado',
  otro:                    '📝 Otro',
}

export async function GET(request: NextRequest) {
  try {
    const { usuario, error: authErr } = await requireAuth(request)
    if (authErr) return authErr

    const prospectoId = new URL(request.url).searchParams.get('prospecto_id')
    if (!prospectoId) return NextResponse.json({ error: 'prospecto_id requerido' }, { status: 400 })

    // Verificar que el prospecto pertenece al usuario o fue creado por su supervisor
    const { data: prospecto } = await supabaseAdmin
      .from('prospectos').select('creado_por').eq('id', prospectoId).maybeSingle()
    if (!prospecto) return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 })

    const tieneAcceso = usuario!.rol === 'abogado' || prospecto.creado_por === usuario!.id
    if (!tieneAcceso) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

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
    const { usuario, error: authErr } = await requireAuth(request)
    if (authErr) return authErr

    const { prospecto_id, tipo, nota } = await request.json()

    // Verificar acceso al prospecto antes de tipificar
    const { data: prospecto } = await supabaseAdmin
      .from('prospectos').select('creado_por, nombre').eq('id', prospecto_id).maybeSingle()
    if (!prospecto) return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 })

    const tieneAcceso = usuario!.rol === 'abogado' || prospecto.creado_por === usuario!.id
    if (!tieneAcceso) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const nombreU = usuario!.nombres?.split(' ')[0] ?? usuario!.nombre_negocio?.split(' ')[0] ?? 'Usuario'

    const { data: tip, error: tipError } = await supabaseAdmin
      .from('tipificaciones')
      .insert({
        prospecto_id,
        usuario_id: usuario!.id,
        tipo,
        nota: tipo === 'otro' ? (nota ?? null) : null,
      })
      .select()
      .single()

    if (tipError) return NextResponse.json({ error: tipError.message }, { status: 400 })

    // Evento en timeline
    const label = TIPO_LABEL[tipo] ?? tipo
    const descripcion = tipo === 'otro' && nota
      ? `${nombreU} tipificó: ${label} — "${nota}"`
      : `${nombreU} tipificó: ${label}`

    await supabaseAdmin.from('prospecto_timeline').insert({
      prospecto_id,
      usuario_id: usuario!.id,
      evento: 'tipificacion',
      descripcion,
    })

    // Notificar al supervisor dueño si quien tipifica es un abogado
    if (usuario!.rol !== 'supervisor' && prospecto.creado_por) {
      await supabaseAdmin.from('notificaciones').insert({
        usuario_id: prospecto.creado_por,
        tipo: 'tipificacion',
        titulo: `Tipificación de ${prospecto.nombre}`,
        mensaje: descripcion,
        leida: false,
      })
    }

    return NextResponse.json({ success: true, tipificacion: tip })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
