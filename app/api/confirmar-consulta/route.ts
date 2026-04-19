import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { emailCliente, nombreCliente, asunto, token } = await request.json()

    const linkSeguimiento = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/seguimiento?token=${token}`

    const { error } = await resend.emails.send({
      from: 'Toropacheco y Asociados <onboarding@resend.dev>',
      to: 'ka.cuestas@duocuc.cl', // TODO: cambiar a emailCliente cuando tengas dominio verificado
      subject: `Consulta recibida: ${asunto}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Toropacheco y Asociados</h2>
          <hr style="border: 1px solid #eee;" />
          <p>Estimado/a <strong>${nombreCliente}</strong>,</p>
          <p>Hemos recibido tu consulta sobre: <strong>${asunto}</strong></p>
          <p>Te responderemos en menos de 24 horas. Puedes revisar el estado de tu consulta en el siguiente enlace:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a
              href="${linkSeguimiento}"
              style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;"
            >
              Ver estado de mi consulta
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">O copia este enlace en tu navegador:<br/>${linkSeguimiento}</p>
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
