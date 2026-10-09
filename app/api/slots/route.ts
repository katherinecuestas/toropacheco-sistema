import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generarSlots } from '@/lib/helpers'
import { chileAUtc, partesChile } from '@/lib/zona-horaria'

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

  // Rango del día en hora de Chile (no en UTC): [00:00 de ese día, 00:00 del día siguiente).
  // El día que empieza el horario de verano las 00:00 no existen y el día parte a las 01:00.
  const inicioDia = (f: string) => chileAUtc(`${f}T00:00`) ?? chileAUtc(`${f}T01:00`)
  const siguiente = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  const desde = inicioDia(fechaISO)
  const hasta = inicioDia(siguiente)
  if (!desde || !hasta) return NextResponse.json({ slots: [] })

  const { data: citasOcupadas } = await supabaseAdmin
    .from('citas')
    .select('fecha_hora')
    .eq('abogado_id', abogadoId)
    .gte('fecha_hora', desde)
    .lt('fecha_hora', hasta)
    .neq('estado', 'cancelada')

  // Se compara fecha + hora en Chile contra los bloques, que también son hora de Chile
  const horasOcupadas = new Set(
    (citasOcupadas || [])
      .map(c => partesChile(c.fecha_hora))
      .filter(p => p.fecha === fechaISO)
      .map(p => p.hora)
  )

  return NextResponse.json({ slots: slots.filter(s => !horasOcupadas.has(s)) })
}
