import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, asunto, respuesta } = await request.json()

    const { error } = await resend.emails.send({
      from: 'Toropacheco y Asociados <onboarding@resend.dev>',
      to: 'ka.cuestas@duocuc.cl', // TODO: aqui se puede cambiar por un dominio real o por el email del cliente
      subject: `Respuesta a tu consulta: ${asunto}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Toropacheco y Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
          <p>Hemos respondido tu consulta sobre: <strong>${asunto}</strong></p>
          <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #333;">${respuesta}</p>
          </div>
          <p>Si tienes más preguntas, no dudes en contactarnos.</p>
          <hr style="border: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Toropacheco y Asociados — Sistema Legal</p>
        </div>
      `
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}