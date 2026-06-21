import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAbogado } from '@/lib/api-auth'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Toro Pacheco & Asociados <no-reply@toropachecoasociados.cl>'

export async function POST(request: NextRequest) {
  const { usuario, error: authErr } = await requireAbogado(request)
  if (authErr) return authErr

  try {
    const { consultaId, respuesta } = await request.json()
    const abogadoId = usuario!.id

    // 1. Actualizar la consulta en la base de datos
    const { data: consulta, error } = await supabaseAdmin
      .from('consultas')
      .update({
        estado: 'respondida',
        respuesta,
        respondida_en: new Date().toISOString(),
        respondida_por: abogadoId,
      })
      .eq('id', consultaId)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    // 2. Enviar respuesta al cliente
    resend.emails.send({
      from: FROM,
      to: consulta.email_cliente,
      subject: `Respuesta a tu consulta: ${consulta.asunto}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1F3A5F;">Toro Pacheco & Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${consulta.nombre_cliente}</strong>,</p>
          <p>Hemos respondido tu consulta sobre: <strong>${consulta.asunto}</strong></p>
          <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #1F3A5F;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Respuesta del abogado</p>
            <p style="margin: 0; white-space: pre-wrap; color: #333;">${respuesta}</p>
          </div>
          <p style="color: #555; font-size: 13px;">Si tienes más dudas puedes contactarnos a <a href="mailto:contacto@toropachecoasociados.cl">contacto@toropachecoasociados.cl</a> o al <a href="https://wa.me/56950944482">+56 9 50944482</a>.</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toro Pacheco & Asociados — contacto@toropachecoasociados.cl</p>
        </div>
      `,
    }).catch((err) => console.error('[responder-consulta] Error enviando email:', err))

    return NextResponse.json({ success: true, consulta })

  } catch {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
