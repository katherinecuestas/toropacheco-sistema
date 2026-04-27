import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  const slots: string[] = []
  const [hInicio, mInicio] = horario.hora_inicio.split(':').map(Number)
  const [hFin, mFin] = horario.hora_fin.split(':').map(Number)
  let minutos = hInicio * 60 + mInicio
  const minutesFin = hFin * 60 + mFin

  while (minutos + 30 <= minutesFin) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0')
    const mm = String(minutos % 60).padStart(2, '0')
    slots.push(`${h}:${mm}`)
    minutos += 30
  }

  // Rango del día completo en zona horaria Chile
  const inicioUTC = new Date(`${fechaISO}T00:00:00`).toLocaleString('sv-SE', { timeZone: TZ })
  const finUTC = new Date(`${fechaISO}T23:59:59`).toLocaleString('sv-SE', { timeZone: TZ })

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
