import { POST } from '../app/api/crear-cita/route'
import { db, resetDb, req, type Respuesta } from './support/fakeSupabase'

jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))

const mockSend = jest.fn().mockResolvedValue({ error: null })
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: (...a: unknown[]) => mockSend(...a) } })),
}))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

beforeEach(() => {
  mockSend.mockClear()
  resetDb({ citas: [] })
})

// Reserva pública (landing / seguimiento): no requiere token
const crear = async (fechaHora: string) =>
  (await POST(req('POST', '/api/crear-cita', undefined, {
    consultaId: null, abogadoId: 2, nombreCliente: 'Ana', emailCliente: 'ana@example.com', fechaHora,
  }) as never)) as unknown as Respuesta

const guardada = () => db.citas[0].fecha_hora as string
const htmlCorreoCliente = () =>
  (mockSend.mock.calls.map(([m]) => m).find((m: { to: string }) => m.to === 'ana@example.com') as { html: string }).html

describe('POST /api/crear-cita — zona horaria', () => {
  it('invierno: guarda 09:00 Chile como 13:00 UTC (offset -04:00)', async () => {
    expect((await crear('2026-06-15T09:00:00')).status).toBe(200)
    expect(guardada()).toBe('2026-06-15T13:00:00.000Z')
  })

  it('verano: guarda 09:00 Chile como 12:00 UTC (offset -03:00)', async () => {
    expect((await crear('2026-10-15T09:00:00')).status).toBe(200)
    expect(guardada()).toBe('2026-10-15T12:00:00.000Z')
  })

  it('el correo al cliente muestra la hora de Chile elegida', async () => {
    await crear('2026-06-15T09:00:00')
    await new Promise(r => setImmediate(r)) // los correos se envían sin bloquear la respuesta
    expect(htmlCorreoCliente()).toContain('09:00')
  })

  it('respeta un instante que ya trae offset', async () => {
    expect((await crear('2026-06-15T13:00:00.000Z')).status).toBe(200)
    expect(guardada()).toBe('2026-06-15T13:00:00.000Z')
  })

  it('400 si la fecha no es válida, sin crear la cita', async () => {
    expect((await crear('mañana a las 9')).status).toBe(400)
    expect(db.citas).toHaveLength(0)
  })
})
