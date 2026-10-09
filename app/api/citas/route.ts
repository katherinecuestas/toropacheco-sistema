import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAbogado } from '@/lib/api-auth'
import { chileAUtc, formatearFechaHoraChile } from '@/lib/zona-horaria'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Verifica que la cita exista y pertenezca al abogado.
 * Devuelve `null` si tiene acceso, o la respuesta 404/403 correspondiente.
 */
async function verificarCita(id: unknown, abogadoId: number) {
  const { data: cita } = await supabaseAdmin
    .from('citas').select('id, abogado_id').eq('id', id).maybeSingle()
  if (!cita) return NextResponse.json({ success: false, error: 'Cita no encontrada' }, { status: 404 })
  if (cita.abogado_id !== abogadoId) return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 })
  return null
}

// GET → listar citas del abogado autenticado (el abogado_id de la query se ignora)
export async function GET(request: NextRequest) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  const { data, error } = await supabaseAdmin
    .from('citas')
    .select('*')
    .eq('abogado_id', usuario!.id)
    .order('fecha_hora', { ascending: true })

  if (error) return NextResponse.json({ citas: [], error: 'Error al obtener citas' }, { status: 500 })
  return NextResponse.json({ citas: data })
}

// PATCH → confirmar cita y enviar email al cliente (solo el abogado dueño)
export async function PATCH(request: NextRequest) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id, action } = await request.json()
    if (action !== 'confirmar') return NextResponse.json({ success: false, error: 'Acción desconocida' }, { status: 400 })

    const accesoErr = await verificarCita(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { data: cita, error } = await supabaseAdmin
      .from('citas')
      .update({ estado: 'confirmada' })
      .eq('id', id)
      .eq('abogado_id', usuario!.id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: 'Error al confirmar la cita' }, { status: 500 })

    const fechaFormateada = formatearFechaHoraChile(cita.fecha_hora)

    await resend.emails.send({
      from: 'Toro Pacheco & Asociados <no-reply@toropachecoasociados.cl>',
      to: cita.email_cliente,
      subject: `Videoconsulta confirmada — ${fechaFormateada}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1F3A5F;">Toro Pacheco & Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${cita.nombre_cliente}</strong>,</p>
          <p>Tu videoconsulta ha sido <strong>confirmada</strong> para el:</p>
          <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <p style="font-size: 18px; font-weight: bold; color: #1F3A5F; margin: 0;">${fechaFormateada}</p>
          </div>
          ${cita.meeting_url ? `
          <p>Ingresa a tu reunión haciendo clic aquí:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${cita.meeting_url}" style="background-color: #1F3A5F; color: #C7B88A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Ingresar a la reunión
            </a>
          </div>
          ` : `<p style="color: #555;">El abogado te enviará el enlace de la reunión próximamente.</p>`}
          <p style="color: #888; font-size: 12px;">Duración: 30 minutos.</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toro Pacheco & Asociados — contacto@toropachecoasociados.cl</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, cita })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// PUT → editar cita (fecha, notas, estado, meeting_url) (solo el abogado dueño)
export async function PUT(request: NextRequest) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id, fecha_hora, notas, estado, meeting_url } = await request.json()

    // La hora editada es hora de Chile; se guarda como instante UTC con el offset de esa fecha
    const fechaHoraUtc = fecha_hora === undefined ? undefined : chileAUtc(fecha_hora)
    if (fechaHoraUtc === null) return NextResponse.json({ success: false, error: 'Fecha u hora inválida' }, { status: 400 })

    const accesoErr = await verificarCita(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { data, error } = await supabaseAdmin
      .from('citas')
      .update({ fecha_hora: fechaHoraUtc, notas, estado, meeting_url })
      .eq('id', id)
      .eq('abogado_id', usuario!.id)
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: 'Error al actualizar la cita' }, { status: 500 })
    return NextResponse.json({ success: true, cita: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → cancelar cita (solo el abogado dueño)
export async function DELETE(request: NextRequest) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { id } = await request.json()

    const accesoErr = await verificarCita(id, usuario!.id)
    if (accesoErr) return accesoErr

    const { error } = await supabaseAdmin.from('citas').update({ estado: 'cancelada' }).eq('id', id).eq('abogado_id', usuario!.id)
    if (error) return NextResponse.json({ success: false, error: 'Error al cancelar la cita' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
