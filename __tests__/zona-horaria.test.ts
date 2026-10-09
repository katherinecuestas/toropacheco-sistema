import { chileAUtc, partesChile, formatearFechaHoraChile } from '../lib/zona-horaria'

describe('chileAUtc()', () => {
  it('invierno (junio, UTC-4): 09:00 Chile → 13:00 UTC', () => {
    expect(chileAUtc('2026-06-15T09:00:00')).toBe('2026-06-15T13:00:00.000Z')
  })

  it('verano (octubre, UTC-3): 09:00 Chile → 12:00 UTC', () => {
    expect(chileAUtc('2026-10-15T09:00:00')).toBe('2026-10-15T12:00:00.000Z')
  })

  it('acepta el formato sin segundos', () => {
    expect(chileAUtc('2026-06-15T09:30')).toBe('2026-06-15T13:30:00.000Z')
  })

  it('una hora de la noche de Chile cae al día siguiente en UTC', () => {
    expect(chileAUtc('2026-01-10T21:30')).toBe('2026-01-11T00:30:00.000Z')
  })

  it('respeta el cambio de horario de abril (fin del verano)', () => {
    expect(chileAUtc('2026-04-04T12:00')).toBe('2026-04-04T15:00:00.000Z') // aún UTC-3
    expect(chileAUtc('2026-04-05T12:00')).toBe('2026-04-05T16:00:00.000Z') // ya UTC-4
  })

  it('respeta el cambio de horario de septiembre (inicio del verano)', () => {
    expect(chileAUtc('2026-09-05T12:00')).toBe('2026-09-05T16:00:00.000Z') // aún UTC-4
    expect(chileAUtc('2026-09-06T12:00')).toBe('2026-09-06T15:00:00.000Z') // ya UTC-3
  })

  it('devuelve null para una hora que no existe por el salto de horario', () => {
    expect(chileAUtc('2026-09-06T00:30')).toBeNull()
  })

  it('respeta un string que ya trae offset o Z', () => {
    expect(chileAUtc('2026-06-15T13:00:00.000Z')).toBe('2026-06-15T13:00:00.000Z')
    expect(chileAUtc('2026-06-15T09:00:00-04:00')).toBe('2026-06-15T13:00:00.000Z')
  })

  it('devuelve null para formatos inválidos', () => {
    expect(chileAUtc('2026-13-01T09:00')).toBeNull()
    expect(chileAUtc('2026-06-15')).toBeNull()
    expect(chileAUtc('no-es-fecha')).toBeNull()
  })
})

describe('partesChile()', () => {
  it('devuelve fecha y hora de Chile de un instante UTC (invierno)', () => {
    expect(partesChile('2026-06-15T13:00:00+00:00')).toEqual({ fecha: '2026-06-15', hora: '09:00' })
  })

  it('usa la fecha de Chile aunque en UTC ya sea el día siguiente', () => {
    expect(partesChile('2026-10-16T02:30:00Z')).toEqual({ fecha: '2026-10-15', hora: '23:30' })
  })

  it('es la inversa de chileAUtc en verano e invierno', () => {
    for (const f of ['2026-06-15T09:00', '2026-10-15T17:30']) {
      const { fecha, hora } = partesChile(chileAUtc(f)!)
      expect(`${fecha}T${hora}`).toBe(f)
    }
  })
})

describe('formatearFechaHoraChile()', () => {
  it('muestra la hora de Chile, no la UTC', () => {
    expect(formatearFechaHoraChile('2026-06-15T13:00:00Z')).toContain('09:00')
    expect(formatearFechaHoraChile('2026-10-15T12:00:00Z')).toContain('09:00')
  })
})
