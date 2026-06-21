import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Toro Pacheco & Asociados <no-reply@toropachecoasociados.cl>'

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, asunto, respuesta } = await request.json()

    const { error } = await resend.emails.send({
      from: FROM,
      to: emailCliente,
      subject: `Respuesta a tu consulta: ${asunto}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1F3A5F;">Toro Pacheco &amp; Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
          <p>Hemos respondido tu consulta sobre: <strong>${asunto}</strong></p>
          <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #1F3A5F;">
            <p style="margin: 0; white-space: pre-wrap; color: #333;">${respuesta}</p>
          </div>
          <p style="color: #555; font-size: 13px;">Si tienes más dudas contáctanos en <a href="mailto:contacto@toropachecoasociados.cl">contacto@toropachecoasociados.cl</a></p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toro Pacheco &amp; Asociados</p>
        </div>
      `,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}