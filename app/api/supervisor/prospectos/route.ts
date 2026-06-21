import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireSupervisor } from '@/lib/api-auth'

const resend = new Resend(process.env.RESEND_API_KEY)
const NOTIFY_EMAIL = 'branco@toropachecoasociados.cl'
const ESTADOS_NOTIFICAR = new Set(['interesado', 'agendado'])

const formatFecha = (f: string | null | undefined) => f ? f.slice(0, 10) : null

function fmtMonto(n: number | null | undefined): string {
  if (!n) return '—'
  return '$' + n.toLocaleString('es-CL')
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function GET(request: NextRequest) {
  try {
    const { usuario, error: authErr } = await requireSupervisor(request)
    if (authErr) return authErr
    const supervisorId = usuario!.id

    const { data, error } = await supabaseAdmin
      .from('prospectos')
      .select('*')
      .eq('creado_por', supervisorId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ prospectos: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { usuario, error: authErr } = await requireSupervisor(request)
    if (authErr) return authErr
    const supervisorId = usuario!.id

    const body = await request.json()
    const { nombre, rut, telefono, email, requerimiento, fecha_requerimiento, juzgado, monto_deuda, estado, observacion, fecha_llamar, plazo_fatal } = body

    const insertar = {
      creado_por: supervisorId,
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
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('prospectos')
      .insert(insertar)
      .select()
      .single()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    // Obtener nombre del supervisor para el timeline
    const { data: sup } = await supabaseAdmin
      .from('usuarios').select('nombres, nombre_negocio').eq('id', supervisorId).maybeSingle()
    const nombreSup = sup?.nombres?.split(' ')[0] ?? sup?.nombre_negocio?.split(' ')[0] ?? 'Supervisor'

    await supabaseAdmin.from('prospecto_timeline').insert({
      prospecto_id: data.id,
      usuario_id: supervisorId,
      evento: 'creado',
      descripcion: `Prospecto creado por ${nombreSup}`,
    })

    return NextResponse.json({ success: true, prospecto: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { usuario, error: authErr } = await requireSupervisor(request)
    if (authErr) return authErr
    const supervisorId = usuario!.id

    // corte es UI-only, no existe como columna en BD
    const { id, corte: _corte, ...campos } = await request.json()
    if (campos.monto_deuda) campos.monto_deuda = Number(campos.monto_deuda)
    campos.fecha_requerimiento = formatFecha(campos.fecha_requerimiento)
    campos.fecha_llamar = formatFecha(campos.fecha_llamar)
    campos.plazo_fatal = formatFecha(campos.plazo_fatal)

    // Leer estado actual antes de actualizar para detectar cambio
    const { data: actual } = await supabaseAdmin
      .from('prospectos')
      .select('estado')
      .eq('id', id)
      .eq('creado_por', supervisorId)
      .maybeSingle()

    const { error } = await supabaseAdmin
      .from('prospectos')
      .update(campos)
      .eq('id', id)
      .eq('creado_por', supervisorId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Timeline event cuando el estado cambia
    if (campos.estado && actual?.estado !== campos.estado) {
      const ESTADO_LBL: Record<string, string> = {
        sin_contacto: 'Sin contacto', no_contesta: 'No contesta', wsp_enviado: 'WSP enviado',
        interesado: 'Interesado', ya_tiene_abogado: 'Ya tiene abogado', agendado: 'Agendado',
      }
      await supabaseAdmin.from('prospecto_timeline').insert({
        prospecto_id: id,
        usuario_id: supervisorId,
        evento: 'estado_cambiado',
        descripcion: `Estado cambiado a "${ESTADO_LBL[campos.estado] ?? campos.estado}"`,
      })
    }

    // Notificar solo si el estado cambia a interesado/agendado
    const nuevoEstado = campos.estado

    if (
      nuevoEstado &&
      ESTADOS_NOTIFICAR.has(nuevoEstado) &&
      actual?.estado !== nuevoEstado
    ) {
      const estadoLabel = nuevoEstado === 'interesado' ? 'Interesado' : 'Agendado'
      const cuerpo = [
        `Vladimir ha marcado un prospecto como ${estadoLabel}.`,
        '',
        `Nombre:      ${campos.nombre || '—'}`,
        `ROL:         ${campos.requerimiento || '—'}`,
        `Tribunal:    ${campos.juzgado || '—'}`,
        `Deuda:       ${fmtMonto(campos.monto_deuda)}`,
        `Plazo:       ${fmtFecha(campos.plazo_fatal)}`,
        `Teléfono:    ${campos.telefono || '—'}`,
        `Observación: ${campos.observacion || '—'}`,
      ].join('\n')

      await resend.emails.send({
        from: 'Sistema Toro Pacheco <notificaciones@toropachecoasociados.cl>',
        to: NOTIFY_EMAIL,
        subject: `Prospecto ${estadoLabel.toLowerCase()} — ${campos.nombre || ''}`,
        text: cuerpo,
      })

      await supabaseAdmin.from('notificaciones').insert({
        usuario_id: supervisorId,
        tipo: 'prospecto',
        titulo: `Nuevo prospecto ${estadoLabel.toLowerCase()} — ${campos.nombre || ''}`,
        mensaje: `ROL: ${campos.requerimiento || '—'} | Tribunal: ${campos.juzgado || '—'} | Deuda: ${fmtMonto(campos.monto_deuda)} | Tel: ${campos.telefono || '—'}`,
        leida: false,
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'No permitido' }, { status: 403 })
}
