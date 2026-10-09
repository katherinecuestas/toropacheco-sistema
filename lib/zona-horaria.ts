/**
 * Conversión de fechas de citas entre hora de Chile y UTC.
 *
 * `citas.fecha_hora` es `timestamptz`: un string sin offset se guardaría como UTC.
 * Toda hora que el usuario elige (bloques de /api/slots, formularios) es hora de Chile,
 * así que se convierte aquí antes de guardar. Se usa `Intl`, que conoce el cambio
 * de horario de America/Santiago (UTC-3 en verano, UTC-4 en invierno).
 */

export const ZONA_CHILE = 'America/Santiago'

const FECHA_HORA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
const CON_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i

const formatoPartes = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_CHILE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
})

/** Partes de calendario (año, mes, día, hora, minuto, segundo) de un instante, en hora de Chile. */
function partesEnChile(instanteMs: number) {
  const p = Object.fromEntries(
    formatoPartes.formatToParts(new Date(instanteMs)).map(x => [x.type, x.value])
  )
  return {
    anio: Number(p.year), mes: Number(p.month), dia: Number(p.day),
    hora: Number(p.hour), minuto: Number(p.minute), segundo: Number(p.second),
  }
}

/** Diferencia en ms entre la hora de Chile y UTC en un instante dado (negativa: -3 h o -4 h). */
function offsetChileMs(instanteMs: number): number {
  const p = partesEnChile(instanteMs)
  const comoUTC = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo)
  return comoUTC - Math.floor(instanteMs / 1000) * 1000
}

/**
 * Interpreta una fecha-hora de calendario como hora de Chile y devuelve el instante en ISO UTC.
 *
 * - `'YYYY-MM-DDTHH:MM'` o `'YYYY-MM-DDTHH:MM:SS'` (sin offset) → se lee como hora de Chile.
 * - Un string que ya trae offset o `Z` → se respeta tal cual (ya es un instante absoluto).
 *
 * @returns ISO con `Z`, o `null` si el formato no es válido.
 *
 * @example chileAUtc('2026-06-15T09:00') → '2026-06-15T13:00:00.000Z'  // invierno, UTC-4
 * @example chileAUtc('2026-10-15T09:00') → '2026-10-15T12:00:00.000Z'  // verano,  UTC-3
 */
export function chileAUtc(fechaHora: string): string | null {
  if (typeof fechaHora !== 'string') return null
  const valor = fechaHora.trim()

  if (CON_OFFSET.test(valor)) {
    const d = new Date(valor)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  const m = FECHA_HORA_LOCAL.exec(valor)
  if (!m) return null
  const [anio, mes, dia, hora, minuto, segundo] = m.slice(1).map(v => Number(v ?? 0))
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59 || segundo > 59) return null

  const comoUTC = Date.UTC(anio, mes - 1, dia, hora, minuto, segundo)
  // Primer intento con el offset vigente en ese momento; se recalcula por si el
  // resultado cae al otro lado de un cambio de horario.
  let instante = comoUTC - offsetChileMs(comoUTC)
  instante = comoUTC - offsetChileMs(instante)

  // Hora inexistente (salto de horario): no hay instante que la represente
  const p = partesEnChile(instante)
  if (p.anio !== anio || p.mes !== mes || p.dia !== dia || p.hora !== hora || p.minuto !== minuto) return null

  return new Date(instante).toISOString()
}

/**
 * Fecha (`YYYY-MM-DD`) y hora (`HH:MM`) en Chile de un instante guardado.
 * Útil para precargar formularios y comparar con los bloques de /api/slots.
 *
 * @example partesChile('2026-06-15T13:00:00+00:00') → { fecha: '2026-06-15', hora: '09:00' }
 */
export function partesChile(instante: string | Date): { fecha: string; hora: string } {
  const p = partesEnChile(new Date(instante).getTime())
  const dos = (n: number) => String(n).padStart(2, '0')
  return { fecha: `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`, hora: `${dos(p.hora)}:${dos(p.minuto)}` }
}

/**
 * Formatea un instante en hora de Chile, en español de Chile.
 * Por defecto: "lunes, 15 de junio de 2026, 09:00".
 */
export function formatearFechaHoraChile(
  instante: string | Date,
  opciones: Intl.DateTimeFormatOptions = {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }
): string {
  return new Date(instante).toLocaleString('es-CL', { ...opciones, timeZone: ZONA_CHILE })
}
