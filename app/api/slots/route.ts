import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generarSlots } from '@/lib/helpers'

const TZ = 'America/Santiago'

function horaChile(fechaHora: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(fechaHora))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const abogadoId = Number(searchParams.get('abogado_id'))
  const fechaISO = searchParams.get('fecha') // YYYY-MM-DD Chile

  if (!abogadoId || !fechaISO) return NextResponse.json({ slots: [] })

  const { data: bloqueada } = await supabaseAdmin
    .from('fechas_bloqueadas')
    .select('id')
    .eq('abogado_id', abogadoId)
    .eq('fecha', fechaISO)
    .maybeSingle()

  if (bloqueada) return NextResponse.json({ slots: [] })

  const [y, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay()

  const { data: horario } = await supabaseAdmin
    .from('disponibilidad')
    .select('*')
    .eq('abogado_id', abogadoId)
    .eq('dia_semana', diaSemana)
    .eq('activo', true)
    .single()

  if (!horario) return NextResponse.json({ slots: [] })

  const slots = generarSlots(horario.hora_inicio, horario.hora_fin)

  const { data: citasOcupadas } = await supabaseAdmin
    .from('citas')
    .select('fecha_hora')
    .eq('abogado_id', abogadoId)
    .gte('fecha_hora', `${fechaISO}T00:00:00`)
    .lte('fecha_hora', `${fechaISO}T23:59:59+00:00`)
    .neq('estado', 'cancelada')

  const horasOcupadas = new Set(
    (citasOcupadas || []).map(c => horaChile(c.fecha_hora))
  )

  return NextResponse.json({ slots: slots.filter(s => !horasOcupadas.has(s)) })
}
