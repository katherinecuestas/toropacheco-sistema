import { supabase } from './supabase'

/**
 * Franja horaria de disponibilidad semanal de un abogado.
 * Un abogado puede tener múltiples franjas activas por día.
 */
export interface Disponibilidad {
  id: number
  abogado_id: number
  dia_semana: number // 1=Lunes ... 7=Domingo
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

/**
 * Cita agendada entre un cliente y un abogado.
 * Puede tener un `meeting_url` de Whereby si es videollamada.
 */
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

/** Nombres de días indexados por `dia_semana` (1-7). El índice 0 queda vacío. */
export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/**
 * Obtiene todas las franjas de disponibilidad de un abogado ordenadas por día.
 * @param abogadoId - ID del abogado en la tabla `usuarios`
 */
export async function obtenerDisponibilidad(abogadoId: number) {
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .eq('abogado_id', abogadoId)
    .order('dia_semana')

  if (error) return { disponibilidad: null, error: error.message }
  return { disponibilidad: data as Disponibilidad[], error: null }
}

/**
 * Reemplaza por completo la disponibilidad semanal de un abogado.
 * Elimina todos los registros existentes e inserta solo los franjas con `activo: true`.
 *
 * @param abogadoId - ID del abogado en la tabla `usuarios`
 * @param horarios - Lista de franjas con día, hora de inicio/fin y estado activo
 */
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

/**
 * Obtiene los slots horarios disponibles para agendar una cita en una fecha específica.
 * Delega a `/api/slots` que filtra según disponibilidad, fechas bloqueadas y citas existentes.
 *
 * @param abogadoId - ID del abogado
 * @param fechaISO - Fecha en formato `YYYY-MM-DD`
 */
export async function obtenerSlotsDisponibles(abogadoId: number, fechaISO: string) {
  const res = await fetch(`/api/slots?abogado_id=${abogadoId}&fecha=${fechaISO}`)
  return res.json()
}

/**
 * Lista todas las citas de un abogado.
 * @param abogadoId - ID del abogado
 */
export async function obtenerMisCitas(abogadoId: number) {
  const res = await fetch(`/api/citas?abogado_id=${abogadoId}`)
  return res.json()
}

/**
 * Obtiene las fechas en las que el abogado no está disponible (vacaciones, días bloqueados).
 * @param abogadoId - ID del abogado
 * @returns Lista de fechas en formato `YYYY-MM-DD`
 */
export async function obtenerFechasBloqueadas(abogadoId: number) {
  const { data, error } = await supabase
    .from('fechas_bloqueadas')
    .select('fecha')
    .eq('abogado_id', abogadoId)
  if (error) return { fechas: [] as string[] }
  return { fechas: (data || []).map((r: { fecha: string }) => r.fecha) }
}

/**
 * Alterna el bloqueo de una fecha para un abogado.
 * Si `bloqueada` es true, elimina el bloqueo; si es false, lo crea.
 *
 * @param abogadoId - ID del abogado
 * @param fecha - Fecha en formato `YYYY-MM-DD`
 * @param bloqueada - Estado actual de la fecha (true = ya estaba bloqueada)
 */
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

/**
 * Confirma una cita pendiente cambiando su estado a `confirmada`.
 * Llama a PATCH `/api/citas` que también envía correo de confirmación.
 *
 * @param id - ID de la cita a confirmar
 */
export async function confirmarCita(id: number) {
  const res = await fetch('/api/citas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'confirmar' }),
  })
  return res.json()
}

/**
 * Edita los datos de una cita existente (fecha, notas, estado, URL de reunión).
 * @param id - ID de la cita
 * @param datos - Campos a actualizar
 */
export async function editarCita(id: number, datos: { fecha_hora: string; notas?: string; estado: string; meeting_url?: string }) {
  const res = await fetch('/api/citas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...datos }),
  })
  return res.json()
}

/**
 * Cancela una cita cambiando su estado a `cancelada`.
 * @param id - ID de la cita a cancelar
 */
export async function cancelarCita(id: number) {
  const res = await fetch('/api/citas', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  return res.json()
}

/**
 * Obtiene la cita más reciente asociada a una consulta.
 * Útil para mostrar el estado de agendamiento desde la vista de la consulta.
 *
 * @param consultaId - ID de la consulta origen
 */
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
