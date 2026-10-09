import { GET, PUT, DELETE } from '../app/api/mis-cuotas/route'
import { db, resetDb, req, TOKEN, ABOGADO_ID, OTRO_ABOGADO_ID, type Respuesta } from './support/fakeSupabase'

jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

const CONTRATO_PROPIO = 10
const CONTRATO_AJENO = 20
const CUOTA_PROPIA = 100
const CUOTA_AJENA = 200

beforeEach(() => resetDb({
  contratos: [
    { id: CONTRATO_PROPIO, abogado_id: ABOGADO_ID, monto_total: 1000000, monto_pie: 200000, saldo: 800000 },
    { id: CONTRATO_AJENO, abogado_id: OTRO_ABOGADO_ID, monto_total: 500000, monto_pie: 100000, saldo: 400000 },
  ],
  cuotas: [
    { id: CUOTA_PROPIA, contrato_id: CONTRATO_PROPIO, numero: 1, monto: 100000, estado: 'pendiente' },
    { id: CUOTA_AJENA, contrato_id: CONTRATO_AJENO, numero: 1, monto: 50000, estado: 'pendiente' },
  ],
}))

const get = async (token?: string, contratoId = CONTRATO_PROPIO) =>
  (await GET(req('GET', `/api/mis-cuotas?contrato_id=${contratoId}`, token))) as unknown as Respuesta
const put = async (token: string | undefined, body: unknown) =>
  (await PUT(req('PUT', '/api/mis-cuotas', token, body))) as unknown as Respuesta
const del = async (token: string | undefined, id: number) =>
  (await DELETE(req('DELETE', '/api/mis-cuotas', token, { id }))) as unknown as Respuesta

const pagar = (id: number) => ({ id, estado: 'pagada', fecha_pago: '2026-10-01', comprobante: '123' })
const cuota = (id: number) => db.cuotas.find(c => c.id === id)

describe('GET /api/mis-cuotas', () => {
  it('401 sin token', async () => expect((await get()).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await get(TOKEN.supervisor)).status).toBe(403))
  it('403 si el contrato es de otro abogado', async () => expect((await get(TOKEN.abogado, CONTRATO_AJENO)).status).toBe(403))
  it('404 si el contrato no existe', async () => expect((await get(TOKEN.abogado, 999)).status).toBe(404))

  it('200 con las cuotas del contrato propio', async () => {
    const res = await get(TOKEN.abogado)
    expect(res.status).toBe(200)
    expect((res.body.cuotas as { id: number }[]).map(c => c.id)).toEqual([CUOTA_PROPIA])
  })
})

describe('PUT /api/mis-cuotas', () => {
  it('401 sin token', async () => {
    expect((await put(undefined, pagar(CUOTA_PROPIA))).status).toBe(401)
    expect(cuota(CUOTA_PROPIA)!.estado).toBe('pendiente')
  })

  it('403 con token de supervisor', async () => expect((await put(TOKEN.supervisor, pagar(CUOTA_PROPIA))).status).toBe(403))

  it('403 si la cuota es de un contrato de otro abogado, sin modificarla', async () => {
    expect((await put(TOKEN.abogado, pagar(CUOTA_AJENA))).status).toBe(403)
    expect(cuota(CUOTA_AJENA)!.estado).toBe('pendiente')
  })

  it('403 aunque el body declare un contrato_id propio', async () => {
    const res = await put(TOKEN.abogado, { ...pagar(CUOTA_AJENA), contrato_id: CONTRATO_PROPIO })
    expect(res.status).toBe(403)
  })

  it('404 si la cuota no existe', async () => expect((await put(TOKEN.abogado, pagar(999))).status).toBe(404))

  it('200 marca la cuota como pagada y recalcula el saldo', async () => {
    const res = await put(TOKEN.abogado, pagar(CUOTA_PROPIA))
    expect(res.status).toBe(200)
    expect(cuota(CUOTA_PROPIA)!.estado).toBe('pagada')
    expect(res.body.saldo).toBe(1000000 - 200000 - 100000)
  })
})

describe('DELETE /api/mis-cuotas', () => {
  it('401 sin token', async () => expect((await del(undefined, CUOTA_PROPIA)).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await del(TOKEN.supervisor, CUOTA_PROPIA)).status).toBe(403))

  it('403 si la cuota es de otro abogado, sin borrarla', async () => {
    expect((await del(TOKEN.abogado, CUOTA_AJENA)).status).toBe(403)
    expect(cuota(CUOTA_AJENA)).toBeDefined()
  })

  it('404 si la cuota no existe', async () => expect((await del(TOKEN.abogado, 999)).status).toBe(404))

  it('200 borra la cuota propia', async () => {
    expect((await del(TOKEN.abogado, CUOTA_PROPIA)).status).toBe(200)
    expect(cuota(CUOTA_PROPIA)).toBeUndefined()
  })
})
