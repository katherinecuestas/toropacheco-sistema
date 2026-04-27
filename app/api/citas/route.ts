import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

// GET → listar citas del abogado (bypasea RLS)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const abogadoId = Number(searchParams.get('abogado_id'))
  if (!abogadoId) return NextResponse.json({ citas: [] })

  const { data, error } = await supabaseAdmin
    .from('citas')
    .select('*')
    .eq('abogado_id', abogadoId)
    .order('fecha_hora', { ascending: true })

  if (error) return NextResponse.json({ citas: [], error: error.message })
  return NextResponse.json({ citas: data })
}

// PATCH → confirmar cita y enviar email al cliente
export async function PATCH(request: NextRequest) {
  try {
    const { id, action } = await request.json()
    if (action !== 'confirmar') return NextResponse.json({ success: false, error: 'Acción desconocida' }, { status: 400 })

    const { data: cita, error } = await supabaseAdmin
      .from('citas')
      .update({ estado: 'confirmada' })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    const fechaFormateada = new Date(cita.fecha_hora).toLocaleString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Santiago',
    })

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

// PUT → editar cita (fecha, notas, estado, meeting_url)
export async function PUT(request: NextRequest) {
  try {
    const { id, fecha_hora, notas, estado, meeting_url } = await request.json()
    const { data, error } = await supabaseAdmin
      .from('citas')
      .update({ fecha_hora, notas, estado, meeting_url })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, cita: data })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → cancelar cita
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    const { error } = await supabaseAdmin.from('citas').update({ estado: 'cancelada' }).eq('id', id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
