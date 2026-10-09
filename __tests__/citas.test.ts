import { GET, PATCH, PUT, DELETE } from '../app/api/citas/route'
import { db, resetDb, req, TOKEN, ABOGADO_ID, OTRO_ABOGADO_ID, type Respuesta } from './support/fakeSupabase'

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

const CITA_PROPIA = 1000
const CITA_AJENA = 2000

const fila = (id: number, abogado_id: number) => ({
  id, abogado_id, estado: 'pendiente', fecha_hora: '2026-10-20T14:00:00Z',
  nombre_cliente: 'Ana', email_cliente: 'ana@example.com', meeting_url: null, notas: null,
})

beforeEach(() => {
  mockSend.mockClear()
  resetDb({ citas: [fila(CITA_PROPIA, ABOGADO_ID), fila(CITA_AJENA, OTRO_ABOGADO_ID)] })
})

const cita = (id: number) => db.citas.find(c => c.id === id)!
const llamar = async (fn: (r: Request) => Promise<unknown>, method: string, token?: string, body?: unknown, path = '/api/citas') =>
  (await fn(req(method, path, token, body))) as unknown as Respuesta

describe('GET /api/citas', () => {
  it('401 sin token', async () => expect((await llamar(GET, 'GET')).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(GET, 'GET', TOKEN.supervisor)).status).toBe(403))

  it('200 solo con las citas propias, ignorando el abogado_id de la query', async () => {
    const res = await llamar(GET, 'GET', TOKEN.abogado, undefined, `/api/citas?abogado_id=${OTRO_ABOGADO_ID}`)
    expect(res.status).toBe(200)
    expect((res.body.citas as { id: number }[]).map(c => c.id)).toEqual([CITA_PROPIA])
  })
})

describe('PATCH /api/citas (confirmar)', () => {
  const body = (id: number) => ({ id, action: 'confirmar' })

  it('401 sin token', async () => expect((await llamar(PATCH, 'PATCH', undefined, body(CITA_PROPIA))).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(PATCH, 'PATCH', TOKEN.supervisor, body(CITA_PROPIA))).status).toBe(403))

  it('403 si la cita es de otro abogado, sin confirmarla ni enviar correo', async () => {
    expect((await llamar(PATCH, 'PATCH', TOKEN.abogado, body(CITA_AJENA))).status).toBe(403)
    expect(cita(CITA_AJENA).estado).toBe('pendiente')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('404 si la cita no existe', async () => expect((await llamar(PATCH, 'PATCH', TOKEN.abogado, body(999))).status).toBe(404))

  it('200 confirma la cita propia y envía el correo', async () => {
    expect((await llamar(PATCH, 'PATCH', TOKEN.abogado, body(CITA_PROPIA))).status).toBe(200)
    expect(cita(CITA_PROPIA).estado).toBe('confirmada')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe('PUT /api/citas (editar)', () => {
  const body = (id: number) => ({ id, fecha_hora: '2026-10-21T15:00:00Z', notas: 'nueva', estado: 'confirmada', meeting_url: 'https://example.com/sala' })

  it('401 sin token', async () => expect((await llamar(PUT, 'PUT', undefined, body(CITA_PROPIA))).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(PUT, 'PUT', TOKEN.supervisor, body(CITA_PROPIA))).status).toBe(403))

  it('403 si la cita es de otro abogado, sin modificarla', async () => {
    expect((await llamar(PUT, 'PUT', TOKEN.abogado, body(CITA_AJENA))).status).toBe(403)
    expect(cita(CITA_AJENA).notas).toBeNull()
  })

  it('404 si la cita no existe', async () => expect((await llamar(PUT, 'PUT', TOKEN.abogado, body(999))).status).toBe(404))

  it('200 edita la cita propia', async () => {
    expect((await llamar(PUT, 'PUT', TOKEN.abogado, body(CITA_PROPIA))).status).toBe(200)
    expect(cita(CITA_PROPIA).notas).toBe('nueva')
  })
})

describe('DELETE /api/citas (cancelar)', () => {
  it('401 sin token', async () => expect((await llamar(DELETE, 'DELETE', undefined, { id: CITA_PROPIA })).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(DELETE, 'DELETE', TOKEN.supervisor, { id: CITA_PROPIA })).status).toBe(403))

  it('403 si la cita es de otro abogado, sin cancelarla', async () => {
    expect((await llamar(DELETE, 'DELETE', TOKEN.abogado, { id: CITA_AJENA })).status).toBe(403)
    expect(cita(CITA_AJENA).estado).toBe('pendiente')
  })

  it('404 si la cita no existe', async () => expect((await llamar(DELETE, 'DELETE', TOKEN.abogado, { id: 999 })).status).toBe(404))

  it('200 cancela la cita propia', async () => {
    expect((await llamar(DELETE, 'DELETE', TOKEN.abogado, { id: CITA_PROPIA })).status).toBe(200)
    expect(cita(CITA_PROPIA).estado).toBe('cancelada')
  })
})
