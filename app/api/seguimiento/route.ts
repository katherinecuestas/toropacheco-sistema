import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Solo las columnas que usa app/seguimiento/page.tsx
const COLUMNAS_CONSULTA = 'id, abogado_id, nombre_cliente, email_cliente, asunto, mensaje, estado, respuesta, respondida_en, created_at'
const COLUMNAS_CITA = 'fecha_hora, meeting_url'

// GET → estado de una consulta y su cita más reciente, por token del enlace de seguimiento (público)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token || !UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Enlace inválido o expirado.' }, { status: 400 })
  }

  try {
    const { data: consulta, error: consultaError } = await supabaseAdmin
      .from('consultas')
      .select(COLUMNAS_CONSULTA)
      .eq('token', token)
      .maybeSingle()

    if (consultaError) return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    if (!consulta) return NextResponse.json({ error: 'Enlace inválido o expirado.' }, { status: 404 })

    const { data: citas, error: citasError } = await supabaseAdmin
      .from('citas')
      .select(COLUMNAS_CITA)
      .eq('consulta_id', consulta.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (citasError) return NextResponse.json({ error: 'Error interno' }, { status: 500 })

    return NextResponse.json({ consulta, cita: citas?.[0] ?? null })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
