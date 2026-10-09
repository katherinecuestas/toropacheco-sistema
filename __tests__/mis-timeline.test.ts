import { GET, POST, PUT, DELETE } from '../app/api/mis-timeline/route'
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
const EVENTO_PROPIO = 300
const EVENTO_AJENO = 400

beforeEach(() => resetDb({
  contratos: [
    { id: CONTRATO_PROPIO, abogado_id: ABOGADO_ID },
    { id: CONTRATO_AJENO, abogado_id: OTRO_ABOGADO_ID },
  ],
  timeline_eventos: [
    { id: EVENTO_PROPIO, contrato_id: CONTRATO_PROPIO, titulo: 'Demanda presentada', descripcion: null, fecha: '2026-09-01', completado: false },
    { id: EVENTO_AJENO, contrato_id: CONTRATO_AJENO, titulo: 'Audiencia', descripcion: null, fecha: '2026-09-02', completado: false },
  ],
}))

const evento = (id: number) => db.timeline_eventos.find(e => e.id === id)
const llamar = async (fn: (r: Request) => Promise<unknown>, method: string, token?: string, body?: unknown, path = '/api/mis-timeline') =>
  (await fn(req(method, path, token, body))) as unknown as Respuesta

const get = (token?: string, contratoId = CONTRATO_PROPIO) =>
  llamar(GET, 'GET', token, undefined, `/api/mis-timeline?contrato_id=${contratoId}`)
const nuevo = (contrato_id: number) => ({ contrato_id, titulo: 'Sentencia', fecha: '2026-10-01', completado: false })
const edicion = (id: number) => ({ id, titulo: 'Editado', fecha: '2026-09-05', completado: true })

describe('GET /api/mis-timeline', () => {
  it('401 sin token', async () => expect((await get()).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await get(TOKEN.supervisor)).status).toBe(403))
  it('401 con token de un admin sin fila en usuarios (no es abogado)', async () => expect((await get(TOKEN.admin)).status).toBe(401))
  it('403 si el contrato es de otro abogado', async () => expect((await get(TOKEN.abogado, CONTRATO_AJENO)).status).toBe(403))
  it('404 si el contrato no existe', async () => expect((await get(TOKEN.abogado, 999)).status).toBe(404))

  it('200 con los eventos del contrato propio', async () => {
    const res = await get(TOKEN.abogado)
    expect(res.status).toBe(200)
    expect((res.body.eventos as { id: number }[]).map(e => e.id)).toEqual([EVENTO_PROPIO])
  })
})

describe('POST /api/mis-timeline', () => {
  const eventosDe = (c: number) => db.timeline_eventos.filter(e => e.contrato_id === c)

  it('401 sin token', async () => expect((await llamar(POST, 'POST', undefined, nuevo(CONTRATO_PROPIO))).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(POST, 'POST', TOKEN.supervisor, nuevo(CONTRATO_PROPIO))).status).toBe(403))

  it('403 si el contrato es de otro abogado, sin crear el evento', async () => {
    expect((await llamar(POST, 'POST', TOKEN.abogado, nuevo(CONTRATO_AJENO))).status).toBe(403)
    expect(eventosDe(CONTRATO_AJENO)).toHaveLength(1)
  })

  it('404 si el contrato no existe', async () => expect((await llamar(POST, 'POST', TOKEN.abogado, nuevo(999))).status).toBe(404))

  it('200 crea el evento en el contrato propio', async () => {
    const res = await llamar(POST, 'POST', TOKEN.abogado, nuevo(CONTRATO_PROPIO))
    expect(res.status).toBe(200)
    expect(eventosDe(CONTRATO_PROPIO)).toHaveLength(2)
  })
})

describe('PUT /api/mis-timeline', () => {
  it('401 sin token', async () => expect((await llamar(PUT, 'PUT', undefined, edicion(EVENTO_PROPIO))).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(PUT, 'PUT', TOKEN.supervisor, edicion(EVENTO_PROPIO))).status).toBe(403))

  it('403 si el evento es de un contrato ajeno, sin modificarlo', async () => {
    expect((await llamar(PUT, 'PUT', TOKEN.abogado, edicion(EVENTO_AJENO))).status).toBe(403)
    expect(evento(EVENTO_AJENO)!.titulo).toBe('Audiencia')
  })

  it('no permite mover un evento propio a un contrato ajeno', async () => {
    await llamar(PUT, 'PUT', TOKEN.abogado, { ...edicion(EVENTO_PROPIO), contrato_id: CONTRATO_AJENO })
    expect(evento(EVENTO_PROPIO)!.contrato_id).toBe(CONTRATO_PROPIO)
  })

  it('404 si el evento no existe', async () => expect((await llamar(PUT, 'PUT', TOKEN.abogado, edicion(999))).status).toBe(404))

  it('200 edita el evento propio', async () => {
    expect((await llamar(PUT, 'PUT', TOKEN.abogado, edicion(EVENTO_PROPIO))).status).toBe(200)
    expect(evento(EVENTO_PROPIO)).toMatchObject({ titulo: 'Editado', completado: true })
  })
})

describe('DELETE /api/mis-timeline', () => {
  it('401 sin token', async () => expect((await llamar(DELETE, 'DELETE', undefined, { id: EVENTO_PROPIO })).status).toBe(401))
  it('403 con token de supervisor', async () => expect((await llamar(DELETE, 'DELETE', TOKEN.supervisor, { id: EVENTO_PROPIO })).status).toBe(403))

  it('403 si el evento es de un contrato ajeno, sin borrarlo', async () => {
    expect((await llamar(DELETE, 'DELETE', TOKEN.abogado, { id: EVENTO_AJENO })).status).toBe(403)
    expect(evento(EVENTO_AJENO)).toBeDefined()
  })

  it('404 si el evento no existe', async () => expect((await llamar(DELETE, 'DELETE', TOKEN.abogado, { id: 999 })).status).toBe(404))

  it('200 borra el evento propio', async () => {
    expect((await llamar(DELETE, 'DELETE', TOKEN.abogado, { id: EVENTO_PROPIO })).status).toBe(200)
    expect(evento(EVENTO_PROPIO)).toBeUndefined()
  })
})
