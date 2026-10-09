import { GET } from '../app/api/slots/route'
import { resetDb, type Respuesta } from './support/fakeSupabase'

jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

const ABOGADO = 2
// 2026-06-15 y 2026-10-15 son lunes (dia_semana 1) y jueves (4)
const disponibilidad = [
  { id: 1, abogado_id: ABOGADO, dia_semana: 1, hora_inicio: '09:00', hora_fin: '11:00', activo: true },
  { id: 2, abogado_id: ABOGADO, dia_semana: 4, hora_inicio: '20:00', hora_fin: '22:00', activo: true },
]
const cita = (id: number, fecha_hora: string, estado = 'confirmada') => ({ id, abogado_id: ABOGADO, fecha_hora, estado })

const slots = async (fecha: string) => {
  const res = (await GET(new Request(`http://localhost/api/slots?abogado_id=${ABOGADO}&fecha=${fecha}`) as never)) as unknown as Respuesta
  return res.body.slots as string[]
}

describe('GET /api/slots — zona horaria', () => {
  it('invierno: una cita 09:00 Chile (13:00 UTC) ocupa el bloque 09:00', async () => {
    resetDb({ disponibilidad, citas: [cita(1, '2026-06-15T13:00:00+00:00')] })
    expect(await slots('2026-06-15')).toEqual(['09:30', '10:00', '10:30'])
  })

  it('verano: una cita 09:00 Chile (12:00 UTC) ocupa el bloque 09:00', async () => {
    resetDb({ disponibilidad, citas: [cita(1, '2026-10-12T12:00:00+00:00')] })
    expect(await slots('2026-10-12')).toEqual(['09:30', '10:00', '10:30'])
  })

  it('una cita de la noche de Chile (día siguiente en UTC) ocupa su bloque', async () => {
    // jueves 15-oct 21:00 Chile = viernes 16-oct 00:00 UTC
    resetDb({ disponibilidad, citas: [cita(1, '2026-10-16T00:00:00+00:00')] })
    expect(await slots('2026-10-15')).toEqual(['20:00', '20:30', '21:30'])
  })

  it('una cita de la noche anterior no bloquea bloques del día consultado', async () => {
    // domingo 14-jun 21:00 Chile = lunes 15-jun 01:00 UTC: no debe afectar al lunes
    resetDb({ disponibilidad, citas: [cita(1, '2026-06-15T01:00:00+00:00')] })
    expect(await slots('2026-06-15')).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })

  it('una cita cancelada no ocupa el bloque', async () => {
    resetDb({ disponibilidad, citas: [cita(1, '2026-06-15T13:00:00+00:00', 'cancelada')] })
    expect(await slots('2026-06-15')).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })
})
