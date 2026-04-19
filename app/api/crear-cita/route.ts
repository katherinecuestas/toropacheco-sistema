import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { consultaId, abogadoId, nombreCliente, emailCliente, fechaHora } = await request.json()

    // 1. Crear sala en Whereby
    const endDate = new Date(fechaHora)
    endDate.setHours(endDate.getHours() + 2)

    const wherebyRes = await fetch('https://api.whereby.dev/v1/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHEREBY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endDate: endDate.toISOString(),
        fields: ['hostRoomUrl'],
      }),
    })

    if (!wherebyRes.ok) {
      const err = await wherebyRes.text()
      return NextResponse.json({ success: false, error: `Whereby: ${err}` }, { status: 400 })
    }

    const whereby = await wherebyRes.json()

    // 2. Guardar cita en Supabase (usando service role para saltarse RLS en insert desde server)
    const { data: cita, error: citaError } = await supabaseAdmin
      .from('citas')
      .insert({
        consulta_id: consultaId,
        abogado_id: abogadoId,
        nombre_cliente: nombreCliente,
        email_cliente: emailCliente,
        fecha_hora: fechaHora,
        estado: 'confirmada',
        whereby_room_url: whereby.roomUrl,
        whereby_host_url: whereby.hostRoomUrl,
        whereby_meeting_id: whereby.meetingId,
      })
      .select()
      .single()

    if (citaError) {
      return NextResponse.json({ success: false, error: citaError.message }, { status: 400 })
    }

    // 3. Enviar email al cliente con el link de la videollamada
    const fechaFormateada = new Date(fechaHora).toLocaleString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    await resend.emails.send({
      from: 'Toropacheco y Asociados <onboarding@resend.dev>',
      to: 'ka.cuestas@duocuc.cl', // TODO: cambiar a emailCliente cuando tengas dominio verificado
      subject: `Cita confirmada — ${fechaFormateada}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Toropacheco y Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
          <p>Tu videoconsulta ha sido confirmada para el:</p>
          <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <p style="font-size: 18px; font-weight: bold; color: #1e40af; margin: 0;">${fechaFormateada}</p>
          </div>
          <p>Ingresa a tu videollamada haciendo click aquí:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a
              href="${whereby.roomUrl}"
              style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;"
            >
              Ingresar a videollamada
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">O copia este enlace: ${whereby.roomUrl}</p>
          <p style="color: #888; font-size: 12px;">La duración de la consulta es de 30 minutos.</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toropacheco y Asociados — Sistema Legal</p>
        </div>
      `
    })

    return NextResponse.json({ success: true, cita })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
