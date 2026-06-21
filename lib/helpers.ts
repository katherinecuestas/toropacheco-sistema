/**
 * Genera una contraseña temporal de 12 caracteres usando Web Crypto API.
 * Excluye letras y números ambiguos (O/0, I/1, l) para mejorar legibilidad.
 */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => chars[b % chars.length])
    .join('')
}

/**
 * Genera los slots horarios de 30 minutos entre `horaInicio` y `horaFin`.
 * El último slot se incluye solo si hay al menos 30 minutos hasta el cierre.
 *
 * @param horaInicio - Hora de inicio en formato `HH:MM`
 * @param horaFin - Hora de cierre en formato `HH:MM`
 * @returns Array de strings `HH:MM` con cada slot disponible
 *
 * @example generarSlots('09:00', '11:00') → ['09:00', '09:30', '10:00', '10:30']
 */
export function generarSlots(horaInicio: string, horaFin: string): string[] {
  const [hInicio, mInicio] = horaInicio.split(':').map(Number)
  const [hFin, mFin] = horaFin.split(':').map(Number)
  let minutos = hInicio * 60 + mInicio
  const minutesFin = hFin * 60 + mFin
  const slots: string[] = []
  while (minutos + 30 <= minutesFin) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0')
    const mm = String(minutos % 60).padStart(2, '0')
    slots.push(`${h}:${mm}`)
    minutos += 30
  }
  return slots
}
