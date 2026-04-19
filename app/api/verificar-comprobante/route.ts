import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const archivo = formData.get('archivo') as File
    const montoEsperado = Number(formData.get('monto_esperado'))

    if (!archivo) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = await archivo.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mediaType = archivo.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

    const isPDF = archivo.type === 'application/pdf'

    const content: Anthropic.MessageParam['content'] = isPDF
      ? [
          {
            type: 'document' as const,
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Analiza este comprobante de pago y extrae la información. El monto esperado es $${montoEsperado.toLocaleString('es-CL')} CLP.

Responde SOLO con este JSON (sin markdown):
{
  "es_comprobante_valido": true/false,
  "monto_detectado": número o null,
  "fecha_detectada": "DD/MM/AAAA" o null,
  "referencia_detectada": "texto" o null,
  "monto_coincide": true/false,
  "observacion": "breve descripción de qué encontraste o por qué no es válido"
}`,
          },
        ]
      : [
          {
            type: 'image' as const,
            source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 },
          },
          {
            type: 'text',
            text: `Analiza esta imagen de comprobante de pago y extrae la información. El monto esperado es $${montoEsperado.toLocaleString('es-CL')} CLP.

Responde SOLO con este JSON (sin markdown):
{
  "es_comprobante_valido": true/false,
  "monto_detectado": número o null,
  "fecha_detectada": "DD/MM/AAAA" o null,
  "referencia_detectada": "texto" o null,
  "monto_coincide": true/false,
  "observacion": "breve descripción de qué encontraste o por qué no es válido"
}`,
          },
        ]

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 500,
      messages: [{ role: 'user', content }],
    })

    const texto = (response.content[0] as { type: string; text: string }).text
    const resultado = JSON.parse(texto)

    return NextResponse.json(resultado)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al analizar el comprobante' }, { status: 500 })
  }
}
