import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Toro Pacheco & Asociados <no-reply@toropachecoasociados.cl>'

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, asunto, mensaje, telefonoCliente, token } = await request.json()

    const linkSeguimiento = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/seguimiento?token=${token}`

    await Promise.all([
      // 1. Acuse de recibo al cliente
      resend.emails.send({
        from: FROM,
        to: emailCliente,
        subject: `Consulta recibida: ${asunto}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1F3A5F;">Toro Pacheco & Asociados</h2>
            <hr style="border: 1px solid #eee;" />
            <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
            <p>Hemos recibido tu consulta sobre: <strong>${asunto}</strong></p>
            <p style="color: #555;">Te responderemos en menos de 24 horas. Puedes revisar el estado de tu consulta aquí:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${linkSeguimiento}"
                style="background-color: #1F3A5F; color: #C7B88A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Ver estado de mi consulta
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">O copia este enlace: ${linkSeguimiento}</p>
            <hr style="border: 1px solid #eee;" />
            <p style="color: #888; font-size: 12px;">Toro Pacheco & Asociados — contacto@toropachecoasociados.cl | +56 9 50944482</p>
          </div>
        `,
      }),

      // 2. Notificación al estudio con copia a Branco
      resend.emails.send({
        from: FROM,
        to: 'contacto@toropachecoasociados.cl',
        cc: ['branco@toropachecoasociados.cl'],
        subject: `Nueva consulta: ${asunto} — ${nombreCliente}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1F3A5F;">Nueva consulta recibida</h2>
            <hr style="border: 1px solid #eee;" />
            <p><strong>Cliente:</strong> ${nombreCliente}</p>
            <p><strong>Email:</strong> <a href="mailto:${emailCliente}">${emailCliente}</a></p>
            ${telefonoCliente ? `<p><strong>Teléfono:</strong> ${telefonoCliente}</p>` : ''}
            <p><strong>Asunto:</strong> ${asunto}</p>
            <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #C7B88A;">
              <p style="margin: 0; white-space: pre-wrap; color: #333;">${mensaje}</p>
            </div>
            <p style="color: #555;">Ingresa al panel del abogado para responder esta consulta.</p>
            <hr style="border: 1px solid #eee;" />
            <p style="color: #888; font-size: 12px;">Notificación automática — Sistema Toro Pacheco</p>
          </div>
        `,
      }),
    ]).catch((err) => console.error('[confirmar-consulta] Error enviando emails:', err))

    // Registrar prospecto web y notificar al supervisor
    const { data: supervisor } = await supabaseAdmin
      .from('usuarios').select('id').eq('rol', 'supervisor').maybeSingle()

    await Promise.all([
      supabaseAdmin.from('prospectos').insert({
        nombre: nombreCliente,
        email: emailCliente,
        telefono: telefonoCliente ?? null,
        estado: 'interesado',
        observacion: `Consulta web: ${asunto}`,
        creado_por: null,
      }),
      ...(supervisor ? [supabaseAdmin.from('notificaciones').insert({
        usuario_id: supervisor.id,
        tipo: 'prospecto',
        titulo: `Nueva consulta web — ${nombreCliente}`,
        mensaje: `Asunto: ${asunto} | Email: ${emailCliente} | Tel: ${telefonoCliente ?? '—'}`,
        leida: false,
      })] : []),
    ]).catch((err) => console.error('[confirmar-consulta] Error insertando prospecto/notificación:', err))

    return NextResponse.json({ success: true })

  } catch {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
