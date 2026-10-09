import { POST } from '../app/api/responder-consulta/route'
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

const CONSULTA_PROPIA = 7
const CONSULTA_AJENA = 8

const fila = (id: number, abogado_id: number) => ({
  id, abogado_id, nombre_cliente: 'Ana', email_cliente: 'ana@example.com',
  asunto: 'Embargo', mensaje: 'Detalle', estado: 'nueva', respuesta: null, respondida_en: null, respondida_por: null,
})

beforeEach(() => {
  mockSend.mockClear()
  resetDb({ consultas: [fila(CONSULTA_PROPIA, ABOGADO_ID), fila(CONSULTA_AJENA, OTRO_ABOGADO_ID)] })
})

const consulta = (id: number) => db.consultas.find(c => c.id === id)!
const responder = async (token: string | undefined, consultaId: number) =>
  (await POST(req('POST', '/api/responder-consulta', token, { consultaId, respuesta: 'Podemos ayudarte' }) as never)) as unknown as Respuesta

describe('POST /api/responder-consulta', () => {
  it('401 sin token, sin responder ni enviar correo', async () => {
    expect((await responder(undefined, CONSULTA_PROPIA)).status).toBe(401)
    expect(consulta(CONSULTA_PROPIA).estado).toBe('nueva')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('403 con token de supervisor', async () => {
    expect((await responder(TOKEN.supervisor, CONSULTA_PROPIA)).status).toBe(403)
  })

  it('403 si la consulta es de otro abogado, sin responder ni enviar correo', async () => {
    expect((await responder(TOKEN.abogado, CONSULTA_AJENA)).status).toBe(403)
    expect(consulta(CONSULTA_AJENA).estado).toBe('nueva')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('404 si la consulta no existe', async () => {
    expect((await responder(TOKEN.abogado, 999)).status).toBe(404)
  })

  it('200 responde la consulta propia y envía el correo', async () => {
    const res = await responder(TOKEN.abogado, CONSULTA_PROPIA)
    expect(res.status).toBe(200)
    expect(consulta(CONSULTA_PROPIA)).toMatchObject({ estado: 'respondida', respuesta: 'Podemos ayudarte', respondida_por: ABOGADO_ID })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
