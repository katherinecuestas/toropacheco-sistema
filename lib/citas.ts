import { supabase } from './supabase'

export interface Disponibilidad {
  id: number
  abogado_id: number
  dia_semana: number // 1=Lunes ... 7=Domingo
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

export interface Cita {
  id: number
  created_at: string
  consulta_id: number
  abogado_id: number
  nombre_cliente: string
  email_cliente: string
  fecha_hora: string
  estado: string
  meeting_url?: string
  duracion_minutos: number
  notas?: string
}

export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export async function obtenerDisponibilidad(abogadoId: number) {
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .eq('abogado_id', abogadoId)
    .order('dia_semana')

  if (error) return { disponibilidad: null, error: error.message }
  return { disponibilidad: data as Disponibilidad[], error: null }
}

export async function guardarDisponibilidad(
  abogadoId: number,
  horarios: { dia_semana: number; hora_inicio: string; hora_fin: string; activo: boolean }[]
) {
  // Eliminar todos los horarios actuales del abogado y reemplazarlos
  const { error: deleteError } = await supabase
    .from('disponibilidad')
    .delete()
    .eq('abogado_id', abogadoId)

  if (deleteError) return { success: false, error: deleteError.message }

  const registros = horarios
    .filter(h => h.activo)
    .map(h => ({ ...h, abogado_id: abogadoId }))

  if (registros.length === 0) return { success: true }

  const { error } = await supabase.from('disponibilidad').insert(registros)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function obtenerSlotsDisponibles(abogadoId: number, fechaISO: string) {
  const res = await fetch(`/api/slots?abogado_id=${abogadoId}&fecha=${fechaISO}`)
  return res.json()
}

export async function obtenerMisCitas(abogadoId: number) {
  const res = await fetch(`/api/citas?abogado_id=${abogadoId}`)
  return res.json()
}

export async function obtenerFechasBloqueadas(abogadoId: number) {
  const { data, error } = await supabase
    .from('fechas_bloqueadas')
    .select('fecha')
    .eq('abogado_id', abogadoId)
  if (error) return { fechas: [] as string[] }
  return { fechas: (data || []).map((r: { fecha: string }) => r.fecha) }
}

export async function toggleFechaBloqueada(abogadoId: number, fecha: string, bloqueada: boolean) {
  if (bloqueada) {
    const { error } = await supabase.from('fechas_bloqueadas').delete()
      .eq('abogado_id', abogadoId).eq('fecha', fecha)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('fechas_bloqueadas').insert({ abogado_id: abogadoId, fecha })
    if (error) return { success: false, error: error.message }
  }
  return { success: true }
}

export async function confirmarCita(id: number) {
  const res = await fetch('/api/citas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'confirmar' }),
  })
  return res.json()
}

export async function editarCita(id: number, datos: { fecha_hora: string; notas?: string; estado: string; meeting_url?: string }) {
  const res = await fetch('/api/citas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...datos }),
  })
  return res.json()
}

export async function cancelarCita(id: number) {
  const res = await fetch('/api/citas', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

export async function obtenerCitaPorConsulta(consultaId: number) {
  const { data, error } = await supabase
    .from('citas')
    .select('*')
    .eq('consulta_id', consultaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return { cita: null }
  return { cita: data as Cita }
}
