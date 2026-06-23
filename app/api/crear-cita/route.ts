import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAbogado } from '@/lib/api-auth'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { consultaId, abogadoId, nombreCliente, emailCliente, fechaHora, meetingUrl, creadaPorAbogado } = body

    // Solo el flujo del abogado (dashboard) requiere auth; la reserva pública desde la landing no tiene token
    if (creadaPorAbogado) {
      const { error: authErr } = await requireAbogado(request)
      if (authErr) return authErr
    }

    // 1. Guardar cita en Supabase
    const { data: cita, error: citaError } = await supabaseAdmin
      .from('citas')
      .insert({
        consulta_id: consultaId,
        abogado_id: abogadoId,
        nombre_cliente: nombreCliente,
        email_cliente: emailCliente,
        fecha_hora: fechaHora,
        estado: creadaPorAbogado ? 'confirmada' : 'pendiente',
        ...(meetingUrl ? { meeting_url: meetingUrl } : {}),
      })
      .select()
      .single()

    if (citaError) {
      return NextResponse.json({ success: false, error: citaError.message }, { status: 400 })
    }

    const fechaFormateada = new Date(fechaHora).toLocaleString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Santiago',
    })

    // Emails: no-fatal — la cita ya fue creada aunque fallen
    const emailCliente_html = creadaPorAbogado
      ? // Caso 2: el abogado agendó — confirmación directa
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1F3A5F;">Toro Pacheco & Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
          <p>Tu videoconsulta ha sido <strong>confirmada</strong> para el:</p>
          <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <p style="font-size: 18px; font-weight: bold; color: #1F3A5F; margin: 0;">${fechaFormateada}</p>
          </div>
          ${meetingUrl ? `<p style="text-align:center;"><a href="${meetingUrl}" style="display:inline-block;background:#1F3A5F;color:#C7B88A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Unirme a la videollamada</a></p>` : ''}
          <p style="color: #888; font-size: 12px;">Si tienes dudas puedes contactarnos a <a href="mailto:contacto@toropachecoasociados.cl">contacto@toropachecoasociados.cl</a> o al <a href="https://wa.me/56950944482">+56 9 50944482</a>.</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toro Pacheco & Asociados — contacto@toropachecoasociados.cl</p>
        </div>`
      : // Caso 1: el cliente agendó desde la landing — solicitud pendiente
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1F3A5F;">Toro Pacheco & Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
          <p>Hemos recibido tu solicitud de videoconsulta para el:</p>
          <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <p style="font-size: 18px; font-weight: bold; color: #1F3A5F; margin: 0;">${fechaFormateada}</p>
          </div>
          <p style="color: #555;">Tu solicitud está siendo revisada. Recibirás un segundo correo una vez que el abogado confirme la cita.</p>
          <p style="color: #888; font-size: 12px;">Si tienes dudas puedes contactarnos a <a href="mailto:contacto@toropachecoasociados.cl">contacto@toropachecoasociados.cl</a> o al <a href="https://wa.me/56950944482">+56 9 50944482</a>.</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toro Pacheco & Asociados — contacto@toropachecoasociados.cl</p>
        </div>`

    void Promise.all([
      // Notificación al estudio (solo cuando llega desde la landing)
      ...(!creadaPorAbogado ? [resend.emails.send({
        from: 'Toro Pacheco & Asociados <no-reply@toropachecoasociados.cl>',
        to: 'contacto@toropachecoasociados.cl',
        subject: `Nueva solicitud de videoconsulta — ${nombreCliente}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1F3A5F;">Nueva solicitud de videoconsulta</h2>
            <hr style="border: 1px solid #eee;" />
            <p><strong>Cliente:</strong> ${nombreCliente}</p>
            <p><strong>Email:</strong> ${emailCliente}</p>
            <p><strong>Fecha solicitada:</strong> ${fechaFormateada}</p>
            <p style="color: #555;">Ingresa al panel del abogado para <strong>confirmar o rechazar</strong> esta solicitud. El cliente recibirá un correo de confirmación una vez que la apruebes.</p>
            <hr style="border: 1px solid #eee;" />
            <p style="color: #888; font-size: 12px;">Notificación automática — Sistema Toro Pacheco</p>
          </div>
        `,
      })] : []),
      // Email al cliente
      resend.emails.send({
        from: 'Toro Pacheco & Asociados <no-reply@toropachecoasociados.cl>',
        to: emailCliente,
        subject: creadaPorAbogado
          ? `Videoconsulta confirmada — ${fechaFormateada}`
          : `Solicitud de videoconsulta recibida — ${fechaFormateada}`,
        html: emailCliente_html,
      }),
    ]).catch((err) => console.error('[crear-cita] Error enviando emails:', err))

    return NextResponse.json({ success: true, cita })

  } catch {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
