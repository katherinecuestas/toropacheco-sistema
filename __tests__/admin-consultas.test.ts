import { PUT, DELETE } from '../app/api/admin/consultas/route'
import { db, resetDb, req, TOKEN, type Respuesta } from './support/fakeSupabase'

jest.mock('../lib/supabase-admin', () => jest.requireActual('./support/fakeSupabase'))

// Simular NextResponse.json como un objeto simple { status, body }
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status ?? 200 }),
  },
}))

const CONSULTA_ID = 5

beforeEach(() => resetDb({
  consultas: [{
    id: CONSULTA_ID, abogado_id: 1, nombre_cliente: 'Ana', email_cliente: 'ana@example.com', telefono_cliente: null,
    asunto: 'Embargo', mensaje: 'Detalle', estado: 'nueva', respuesta: null,
  }],
}))

const consulta = () => db.consultas.find(c => c.id === CONSULTA_ID)
const edicion = (id = CONSULTA_ID) => ({
  id, nombre_cliente: 'Ana', email_cliente: 'ana@example.com', asunto: 'Embargo editado',
  mensaje: 'Detalle', estado: 'respondida', respuesta: 'Respuesta',
})
const put = async (token?: string, body: unknown = edicion()) =>
  (await PUT(req('PUT', '/api/admin/consultas', token, body) as never)) as unknown as Respuesta
const del = async (token?: string, id = CONSULTA_ID) =>
  (await DELETE(req('DELETE', '/api/admin/consultas', token, { id }) as never)) as unknown as Respuesta

// En este endpoint no hay "recurso de otro abogado": el admin gestiona todas las consultas.
// El caso equivalente es un abogado (dueño de la consulta) que intenta usar la ruta admin → 403.

describe('PUT /api/admin/consultas', () => {
  it('401 sin token, sin modificar', async () => {
    expect((await put()).status).toBe(401)
    expect(consulta()!.asunto).toBe('Embargo')
  })

  it('403 con token de abogado aunque sea el dueño de la consulta', async () => {
    expect((await put(TOKEN.abogado)).status).toBe(403)
    expect(consulta()!.asunto).toBe('Embargo')
  })

  it('403 con token de supervisor', async () => expect((await put(TOKEN.supervisor)).status).toBe(403))
  it('404 si la consulta no existe', async () => expect((await put(TOKEN.admin, edicion(999))).status).toBe(404))

  it('200 con token de admin', async () => {
    const res = await put(TOKEN.admin)
    expect(res.status).toBe(200)
    expect(consulta()!.asunto).toBe('Embargo editado')
    expect(consulta()!.respondida_en).toBeDefined()
  })
})

describe('DELETE /api/admin/consultas', () => {
  it('401 sin token, sin borrar', async () => {
    expect((await del()).status).toBe(401)
    expect(consulta()).toBeDefined()
  })

  it('403 con token de abogado aunque sea el dueño de la consulta', async () => {
    expect((await del(TOKEN.abogado)).status).toBe(403)
    expect(consulta()).toBeDefined()
  })

  it('403 con token de supervisor', async () => expect((await del(TOKEN.supervisor)).status).toBe(403))
  it('404 si la consulta no existe', async () => expect((await del(TOKEN.admin, 999)).status).toBe(404))

  it('200 con token de admin', async () => {
    expect((await del(TOKEN.admin)).status).toBe(200)
    expect(consulta()).toBeUndefined()
  })
})
